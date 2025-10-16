# Módulo P2P - BotCriptoFy2

## 🚀 Visão Geral

Sistema P2P completo para compra e venda direta de criptomoedas entre traders da plataforma e usuários externos, com intermediação segura da plataforma e comissão configurável.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **P2P Marketplace**: Mercado P2P principal
- **Order Management System**: Sistema de gestão de ordens
- **Escrow System**: Sistema de garantia/escrow
- **Payment Gateway Integration**: Integração com gateways de pagamento
- **Dispute Resolution System**: Sistema de resolução de disputas
- **P2P Dashboard**: Dashboard exclusivo para usuários P2P
- **External User Management**: Gestão de usuários externos
- **Commission Engine**: Motor de comissões configurável
- **Security Validator**: Validador de segurança P2P
- **Notification System**: Sistema de notificações P2P

### Estratégia de Funcionamento
- **Intermediação Segura**: Plataforma atua como intermediária
- **Comissão Configurável**: 10% padrão, totalmente configurável
- **Escrow Automático**: Valores ficam em garantia durante transação
- **Múltiplos Métodos de Pagamento**: PIX, TED, cartão, cripto
- **Sistema de Reputação**: Avaliações e confiabilidade
- **Resolução de Disputas**: Sistema automático e manual
- **Dashboard Exclusivo**: Interface dedicada para P2P
- **Usuários Externos**: Acesso limitado apenas ao P2P

## 📊 Estrutura de Dados

### Tabelas do Sistema

#### 1. p2p_users
```sql
CREATE TABLE p2p_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id), -- NULL para usuários externos
  external_user_id VARCHAR(100), -- ID para usuários externos
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  document_type VARCHAR(20), -- cpf, cnpj, passport
  document_number VARCHAR(50),
  user_type VARCHAR(20) NOT NULL, -- platform_user, external_user
  p2p_status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
  verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  reputation_score DECIMAL(3,2) DEFAULT 5.0, -- 0.0 a 10.0
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  failed_trades INTEGER DEFAULT 0,
  total_volume DECIMAL(20,8) DEFAULT 0,
  kyc_verified BOOLEAN DEFAULT false,
  kyc_level VARCHAR(20) DEFAULT 'basic', -- basic, intermediate, advanced
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email),
  UNIQUE(document_number)
);
```

#### 2. p2p_ads
```sql
CREATE TABLE p2p_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES p2p_users(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  ad_type VARCHAR(20) NOT NULL, -- buy, sell
  price DECIMAL(20,8) NOT NULL,
  price_type VARCHAR(20) NOT NULL, -- fixed, percentage, market
  min_amount DECIMAL(20,8) NOT NULL,
  max_amount DECIMAL(20,8) NOT NULL,
  available_amount DECIMAL(20,8) NOT NULL,
  payment_methods JSONB NOT NULL, -- [{"type": "pix", "name": "PIX"}, {"type": "ted", "name": "TED"}]
  terms TEXT,
  auto_reply TEXT,
  ad_status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
  is_auto_reply BOOLEAN DEFAULT false,
  min_trade_time INTEGER DEFAULT 15, -- minutos
  max_trade_time INTEGER DEFAULT 60, -- minutos
  completion_rate DECIMAL(5,2) DEFAULT 100.0,
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. p2p_orders
```sql
CREATE TABLE p2p_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES p2p_ads(id),
  buyer_id UUID NOT NULL REFERENCES p2p_users(id),
  seller_id UUID NOT NULL REFERENCES p2p_users(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  amount DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  total_value DECIMAL(20,8) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL, -- Taxa de comissão aplicada
  commission_amount DECIMAL(20,8) NOT NULL, -- Valor da comissão
  net_amount DECIMAL(20,8) NOT NULL, -- Valor líquido para o vendedor
  payment_method VARCHAR(50) NOT NULL,
  payment_details JSONB, -- Detalhes específicos do método de pagamento
  order_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, confirmed, completed, cancelled, disputed
  escrow_status VARCHAR(20) DEFAULT 'pending', -- pending, locked, released, refunded
  trade_time_limit INTEGER NOT NULL, -- minutos
  payment_deadline TIMESTAMP WITH TIME ZONE,
  confirmation_deadline TIMESTAMP WITH TIME ZONE,
  auto_release_time TIMESTAMP WITH TIME ZONE,
  buyer_message TEXT,
  seller_message TEXT,
  dispute_reason TEXT,
  dispute_evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. p2p_escrow
```sql
CREATE TABLE p2p_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  amount DECIMAL(20,8) NOT NULL,
  escrow_type VARCHAR(20) NOT NULL, -- crypto, fiat
  escrow_status VARCHAR(20) DEFAULT 'locked', -- locked, released, refunded
  release_conditions JSONB, -- Condições para liberação
  auto_release_time TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  released_by UUID REFERENCES users(id),
  release_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. p2p_payments
```sql
CREATE TABLE p2p_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id),
  payment_method VARCHAR(50) NOT NULL,
  payment_type VARCHAR(20) NOT NULL, -- fiat, crypto
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_reference VARCHAR(255),
  payment_proof JSONB, -- Comprovantes de pagamento
  payment_gateway VARCHAR(50),
  gateway_transaction_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. p2p_disputes
```sql
CREATE TABLE p2p_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id),
  complainant_id UUID NOT NULL REFERENCES p2p_users(id),
  respondent_id UUID NOT NULL REFERENCES p22p_users(id),
  dispute_type VARCHAR(50) NOT NULL, -- payment_not_received, payment_not_confirmed, quality_issue, other
  dispute_reason TEXT NOT NULL,
  dispute_evidence JSONB,
  dispute_status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, closed
  assigned_moderator_id UUID REFERENCES users(id),
  resolution VARCHAR(20), -- buyer_wins, seller_wins, partial_refund, full_refund
  resolution_amount DECIMAL(20,8),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

#### 7. p2p_reviews
```sql
CREATE TABLE p2p_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id),
  reviewer_id UUID NOT NULL REFERENCES p2p_users(id),
  reviewed_id UUID NOT NULL REFERENCES p2p_users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_type VARCHAR(20) NOT NULL, -- buyer_review, seller_review
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. p2p_commissions
```sql
CREATE TABLE p2p_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id),
  commission_type VARCHAR(20) NOT NULL, -- platform, affiliate, referral
  recipient_id UUID REFERENCES users(id),
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(20,8) NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 9. p2p_configuration
```sql
CREATE TABLE p2p_configuration (
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

#### 10. p2p_blacklist
```sql
CREATE TABLE p2p_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES p2p_users(id),
  document_number VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(20),
  reason TEXT NOT NULL,
  blacklist_type VARCHAR(20) NOT NULL, -- user, document, email, phone
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação do Sistema

### 1. P2P Marketplace Manager

```typescript
// backend/src/p2p/p2p-marketplace-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';
import { NotificationService } from '../notifications/notification-service';
import { EscrowSystem } from './escrow-system';
import { CommissionEngine } from './commission-engine';

export class P2PMarketplaceManager {
  private auditLogger: AuditLogger;
  private notificationService: NotificationService;
  private escrowSystem: EscrowSystem;
  private commissionEngine: CommissionEngine;

  constructor() {
    this.auditLogger = new AuditLogger();
    this.notificationService = new NotificationService();
    this.escrowSystem = new EscrowSystem();
    this.commissionEngine = new CommissionEngine();
  }

  async createP2PUser(
    userData: {
      userId?: string;
      email: string;
      phone?: string;
      name: string;
      documentType?: string;
      documentNumber?: string;
      userType: 'platform_user' | 'external_user';
    },
    context: any
  ): Promise<{
    success: boolean;
    p2pUserId?: string;
    message: string;
  }> {
    try {
      // Verificar se usuário já existe
      const existingUser = await prisma.p2pUser.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { documentNumber: userData.documentNumber }
          ]
        }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User already exists in P2P system'
        };
      }

      // Verificar blacklist
      const isBlacklisted = await this.checkBlacklist(userData);
      if (isBlacklisted) {
        return {
          success: false,
          message: 'User is blacklisted from P2P system'
        };
      }

      // Criar usuário P2P
      const p2pUser = await prisma.p2pUser.create({
        data: {
          userId: userData.userId,
          externalUserId: userData.userType === 'external_user' ? 
            `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
          email: userData.email,
          phone: userData.phone,
          name: userData.name,
          documentType: userData.documentType,
          documentNumber: userData.documentNumber,
          userType: userData.userType,
          verificationStatus: userData.userType === 'platform_user' ? 'verified' : 'pending'
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'p2p_user',
        resourceId: p2pUser.id,
        module: 'p2p',
        description: `Created P2P user: ${userData.name}`,
        newValues: userData,
        metadata: { p2pUserId: p2pUser.id }
      }, context);

      return {
        success: true,
        p2pUserId: p2pUser.id,
        message: 'P2P user created successfully'
      };

    } catch (error) {
      console.error('Error creating P2P user:', error);
      return {
        success: false,
        message: 'Failed to create P2P user'
      };
    }
  }

  async createAd(
    p2pUserId: string,
    adData: {
      assetId: string;
      adType: 'buy' | 'sell';
      price: number;
      priceType: 'fixed' | 'percentage' | 'market';
      minAmount: number;
      maxAmount: number;
      availableAmount: number;
      paymentMethods: Array<{
        type: string;
        name: string;
        details?: any;
      }>;
      terms?: string;
      autoReply?: string;
      minTradeTime?: number;
      maxTradeTime?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    adId?: string;
    message: string;
  }> {
    try {
      // Verificar se usuário P2P existe e está ativo
      const p2pUser = await prisma.p2pUser.findUnique({
        where: { id: p2pUserId }
      });

      if (!p2pUser || p2pUser.p2pStatus !== 'active') {
        return {
          success: false,
          message: 'P2P user not found or inactive'
        };
      }

      // Verificar limites de anúncios
      const activeAdsCount = await prisma.p2pAd.count({
        where: {
          userId: p2pUserId,
          adStatus: 'active'
        }
      });

      const maxAds = await this.getMaxAdsPerUser(p2pUser.userType);
      if (activeAdsCount >= maxAds) {
        return {
          success: false,
          message: 'Maximum number of active ads reached'
        };
      }

      // Criar anúncio
      const ad = await prisma.p2pAd.create({
        data: {
          userId: p2pUserId,
          assetId: adData.assetId,
          adType: adData.adType,
          price: adData.price,
          priceType: adData.priceType,
          minAmount: adData.minAmount,
          maxAmount: adData.maxAmount,
          availableAmount: adData.availableAmount,
          paymentMethods: adData.paymentMethods,
          terms: adData.terms,
          autoReply: adData.autoReply,
          isAutoReply: !!adData.autoReply,
          minTradeTime: adData.minTradeTime || 15,
          maxTradeTime: adData.maxTradeTime || 60
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'p2p_ad',
        resourceId: ad.id,
        module: 'p2p',
        description: `Created P2P ad: ${adData.adType} ${adData.assetId}`,
        newValues: adData,
        metadata: { adId: ad.id, p2pUserId }
      }, context);

      return {
        success: true,
        adId: ad.id,
        message: 'P2P ad created successfully'
      };

    } catch (error) {
      console.error('Error creating P2P ad:', error);
      return {
        success: false,
        message: 'Failed to create P2P ad'
      };
    }
  }

  async createOrder(
    adId: string,
    buyerId: string,
    orderData: {
      amount: number;
      paymentMethod: string;
      paymentDetails?: any;
      buyerMessage?: string;
    },
    context: any
  ): Promise<{
    success: boolean;
    orderId?: string;
    message: string;
  }> {
    try {
      // Buscar anúncio
      const ad = await prisma.p2pAd.findUnique({
        where: { id: adId },
        include: {
          user: true,
          asset: true
        }
      });

      if (!ad || ad.adStatus !== 'active') {
        return {
          success: false,
          message: 'Ad not found or inactive'
        };
      }

      // Verificar se comprador é diferente do vendedor
      if (ad.userId === buyerId) {
        return {
          success: false,
          message: 'Cannot create order for your own ad'
        };
      }

      // Verificar saldo disponível
      if (ad.availableAmount < orderData.amount) {
        return {
          success: false,
          message: 'Insufficient available amount'
        };
      }

      // Verificar limites mínimos e máximos
      if (orderData.amount < ad.minAmount || orderData.amount > ad.maxAmount) {
        return {
          success: false,
          message: 'Amount outside allowed range'
        };
      }

      // Calcular valores
      const price = await this.calculatePrice(ad, orderData.amount);
      const totalValue = orderData.amount * price;
      const commissionRate = await this.getCommissionRate(ad.userType);
      const commissionAmount = totalValue * commissionRate;
      const netAmount = totalValue - commissionAmount;

      // Criar ordem
      const order = await prisma.p2pOrder.create({
        data: {
          adId,
          buyerId,
          sellerId: ad.userId,
          assetId: ad.assetId,
          amount: orderData.amount,
          price,
          totalValue,
          commissionRate,
          commissionAmount,
          netAmount,
          paymentMethod: orderData.paymentMethod,
          paymentDetails: orderData.paymentDetails,
          tradeTimeLimit: ad.maxTradeTime,
          buyerMessage: orderData.buyerMessage
        }
      });

      // Atualizar anúncio
      await prisma.p2pAd.update({
        where: { id: adId },
        data: {
          availableAmount: ad.availableAmount - orderData.amount,
          totalTrades: ad.totalTrades + 1
        }
      });

      // Criar escrow
      await this.escrowSystem.createEscrow(order.id, {
        assetId: ad.assetId,
        amount: orderData.amount,
        escrowType: 'crypto'
      });

      // Notificar vendedor
      await this.notificationService.sendNotification({
        userId: ad.userId,
        type: 'p2p_order_created',
        title: 'Nova Ordem P2P',
        message: `Nova ordem de ${orderData.amount} ${ad.asset.symbol} criada`,
        metadata: {
          orderId: order.id,
          amount: orderData.amount,
          assetSymbol: ad.asset.symbol
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'p2p_order',
        resourceId: order.id,
        module: 'p2p',
        description: `Created P2P order: ${orderData.amount} ${ad.asset.symbol}`,
        newValues: orderData,
        metadata: { orderId: order.id, adId, buyerId }
      }, context);

      return {
        success: true,
        orderId: order.id,
        message: 'P2P order created successfully'
      };

    } catch (error) {
      console.error('Error creating P2P order:', error);
      return {
        success: false,
        message: 'Failed to create P2P order'
      };
    }
  }

  private async checkBlacklist(userData: any): Promise<boolean> {
    const blacklistEntries = await prisma.p2pBlacklist.findMany({
      where: {
        isActive: true,
        OR: [
          { email: userData.email },
          { documentNumber: userData.documentNumber },
          { phone: userData.phone }
        ]
      }
    });

    return blacklistEntries.length > 0;
  }

  private async getMaxAdsPerUser(userType: string): Promise<number> {
    const config = await prisma.p2pConfiguration.findFirst({
      where: {
        configKey: `max_ads_${userType}`,
        isActive: true
      }
    });

    return config ? Number(config.configValue) : (userType === 'platform_user' ? 10 : 5);
  }

  private async calculatePrice(ad: any, amount: number): Promise<number> {
    switch (ad.priceType) {
      case 'fixed':
        return ad.price;
      case 'percentage':
        // Implementar cálculo baseado em porcentagem do preço de mercado
        return ad.price;
      case 'market':
        // Implementar cálculo baseado no preço de mercado atual
        return ad.price;
      default:
        return ad.price;
    }
  }

  private async getCommissionRate(userType: string): Promise<number> {
    const config = await prisma.p2pConfiguration.findFirst({
      where: {
        configKey: `commission_rate_${userType}`,
        isActive: true
      }
    });

    return config ? Number(config.configValue) : 0.10; // 10% padrão
  }
}
```

### 2. Escrow System

```typescript
// backend/src/p2p/escrow-system.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';

export class EscrowSystem {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async createEscrow(
    orderId: string,
    escrowData: {
      assetId: string;
      amount: number;
      escrowType: 'crypto' | 'fiat';
    }
  ): Promise<{
    success: boolean;
    escrowId?: string;
    message: string;
  }> {
    try {
      const order = await prisma.p2pOrder.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      // Calcular tempo de auto-liberação
      const autoReleaseTime = new Date();
      autoReleaseTime.setMinutes(autoReleaseTime.getMinutes() + order.tradeTimeLimit);

      const escrow = await prisma.p2pEscrow.create({
        data: {
          orderId,
          assetId: escrowData.assetId,
          amount: escrowData.amount,
          escrowType: escrowData.escrowType,
          autoReleaseTime,
          releaseConditions: {
            paymentConfirmed: true,
            noDispute: true,
            timeElapsed: true
          }
        }
      });

      return {
        success: true,
        escrowId: escrow.id,
        message: 'Escrow created successfully'
      };

    } catch (error) {
      console.error('Error creating escrow:', error);
      return {
        success: false,
        message: 'Failed to create escrow'
      };
    }
  }

  async releaseEscrow(
    orderId: string,
    releasedBy: string,
    reason: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const escrow = await prisma.p2pEscrow.findFirst({
        where: { orderId }
      });

      if (!escrow || escrow.escrowStatus !== 'locked') {
        return {
          success: false,
          message: 'Escrow not found or not locked'
        };
      }

      // Atualizar escrow
      await prisma.p2pEscrow.update({
        where: { id: escrow.id },
        data: {
          escrowStatus: 'released',
          releasedAt: new Date(),
          releasedBy,
          releaseReason: reason
        }
      });

      // Atualizar ordem
      await prisma.p2pOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: 'completed',
          escrowStatus: 'released'
        }
      });

      // Processar comissões
      await this.processCommissions(orderId);

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'release',
        resourceType: 'p2p_escrow',
        resourceId: escrow.id,
        module: 'p2p',
        description: `Released escrow: ${reason}`,
        metadata: { orderId, releasedBy }
      }, context);

      return {
        success: true,
        message: 'Escrow released successfully'
      };

    } catch (error) {
      console.error('Error releasing escrow:', error);
      return {
        success: false,
        message: 'Failed to release escrow'
      };
    }
  }

  async refundEscrow(
    orderId: string,
    refundedBy: string,
    reason: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const escrow = await prisma.p2pEscrow.findFirst({
        where: { orderId }
      });

      if (!escrow || escrow.escrowStatus !== 'locked') {
        return {
          success: false,
          message: 'Escrow not found or not locked'
        };
      }

      // Atualizar escrow
      await prisma.p2pEscrow.update({
        where: { id: escrow.id },
        data: {
          escrowStatus: 'refunded',
          releasedAt: new Date(),
          releasedBy: refundedBy,
          releaseReason: reason
        }
      });

      // Atualizar ordem
      await prisma.p2pOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: 'cancelled',
          escrowStatus: 'refunded'
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'refund',
        resourceType: 'p2p_escrow',
        resourceId: escrow.id,
        module: 'p2p',
        description: `Refunded escrow: ${reason}`,
        metadata: { orderId, refundedBy }
      }, context);

      return {
        success: true,
        message: 'Escrow refunded successfully'
      };

    } catch (error) {
      console.error('Error refunding escrow:', error);
      return {
        success: false,
        message: 'Failed to refund escrow'
      };
    }
  }

  private async processCommissions(orderId: string): Promise<void> {
    const order = await prisma.p2pOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) return;

    // Criar comissão da plataforma
    await prisma.p2pCommission.create({
      data: {
        orderId,
        commissionType: 'platform',
        commissionRate: order.commissionRate,
        commissionAmount: order.commissionAmount,
        assetId: order.assetId,
        status: 'paid'
      }
    });

    // Processar comissões de afiliados se aplicável
    // Implementar lógica de comissões de afiliados
  }
}
```

### 3. P2P Dashboard

```typescript
// frontend/src/components/p2p/P2PDashboard.tsx
import React, { useState, useEffect } from 'react';

interface P2PDashboardProps {
  userId: string;
  userType: 'platform_user' | 'external_user';
}

export const P2PDashboard: React.FC<P2PDashboardProps> = ({ userId, userType }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`/api/p2p/dashboard/${userId}`);
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

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p2p-dashboard">
      <h2>🔄 Dashboard P2P</h2>
      
      {/* Estatísticas do Usuário */}
      <div className="user-stats">
        <div className="stat-card">
          <h3>Reputação</h3>
          <div className="stat-value">{dashboardData?.userStats.reputationScore}/10</div>
        </div>
        <div className="stat-card">
          <h3>Total de Trades</h3>
          <div className="stat-value">{dashboardData?.userStats.totalTrades}</div>
        </div>
        <div className="stat-card">
          <h3>Trades Bem-sucedidos</h3>
          <div className="stat-value">{dashboardData?.userStats.successfulTrades}</div>
        </div>
        <div className="stat-card">
          <h3>Volume Total</h3>
          <div className="stat-value">${dashboardData?.userStats.totalVolume.toLocaleString()}</div>
        </div>
      </div>

      {/* Anúncios Ativos */}
      <div className="active-ads">
        <h3>📢 Meus Anúncios Ativos</h3>
        <div className="ads-list">
          {dashboardData?.activeAds.map(ad => (
            <div key={ad.id} className="ad-item">
              <div className="ad-header">
                <h4>{ad.adType === 'buy' ? '🛒 Comprando' : '💰 Vendendo'} {ad.asset.symbol}</h4>
                <span className="ad-price">${ad.price.toLocaleString()}</span>
              </div>
              
              <div className="ad-details">
                <div className="detail-item">
                  <span className="label">Valor Disponível:</span>
                  <span className="value">{ad.availableAmount} {ad.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Limite Mínimo:</span>
                  <span className="value">{ad.minAmount} {ad.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Limite Máximo:</span>
                  <span className="value">{ad.maxAmount} {ad.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Métodos de Pagamento:</span>
                  <span className="value">
                    {ad.paymentMethods.map(method => method.name).join(', ')}
                  </span>
                </div>
              </div>
              
              <div className="ad-actions">
                <button className="edit-button">✏️ Editar</button>
                <button className="pause-button">⏸️ Pausar</button>
                <button className="delete-button">🗑️ Excluir</button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="create-ad-button">
          ➕ Criar Novo Anúncio
        </button>
      </div>

      {/* Ordens Ativas */}
      <div className="active-orders">
        <h3>📋 Ordens Ativas</h3>
        <div className="orders-list">
          {dashboardData?.activeOrders.map(order => (
            <div key={order.id} className="order-item">
              <div className="order-header">
                <h4>Ordem #{order.id.slice(0, 8)}</h4>
                <span className={`order-status ${order.orderStatus}`}>
                  {order.orderStatus === 'pending' ? '⏳ Pendente' :
                   order.orderStatus === 'paid' ? '💳 Pago' :
                   order.orderStatus === 'confirmed' ? '✅ Confirmado' :
                   order.orderStatus === 'completed' ? '🎉 Concluído' :
                   order.orderStatus === 'cancelled' ? '❌ Cancelado' :
                   order.orderStatus === 'disputed' ? '⚠️ Em Disputa' : '❓ Desconhecido'}
                </span>
              </div>
              
              <div className="order-details">
                <div className="detail-item">
                  <span className="label">Ativo:</span>
                  <span className="value">{order.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Quantidade:</span>
                  <span className="value">{order.amount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Preço:</span>
                  <span className="value">${order.price.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor Total:</span>
                  <span className="value">${order.totalValue.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Método de Pagamento:</span>
                  <span className="value">{order.paymentMethod}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Tempo Limite:</span>
                  <span className="value">{order.tradeTimeLimit} minutos</span>
                </div>
              </div>
              
              <div className="order-actions">
                {order.orderStatus === 'pending' && (
                  <>
                    <button className="pay-button">💳 Marcar como Pago</button>
                    <button className="cancel-button">❌ Cancelar</button>
                  </>
                )}
                {order.orderStatus === 'paid' && (
                  <>
                    <button className="confirm-button">✅ Confirmar Recebimento</button>
                    <button className="dispute-button">⚠️ Abrir Disputa</button>
                  </>
                )}
                {order.orderStatus === 'disputed' && (
                  <button className="view-dispute-button">👁️ Ver Disputa</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de Trades */}
      <div className="trade-history">
        <h3>📊 Histórico de Trades</h3>
        <div className="history-list">
          {dashboardData?.tradeHistory.map(trade => (
            <div key={trade.id} className="history-item">
              <div className="history-header">
                <h4>Trade #{trade.id.slice(0, 8)}</h4>
                <span className="history-date">
                  {new Date(trade.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="history-details">
                <div className="detail-item">
                  <span className="label">Ativo:</span>
                  <span className="value">{trade.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Quantidade:</span>
                  <span className="value">{trade.amount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor:</span>
                  <span className="value">${trade.totalValue.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`value status-${trade.orderStatus}`}>
                    {trade.orderStatus === 'completed' ? '✅ Concluído' :
                     trade.orderStatus === 'cancelled' ? '❌ Cancelado' : '❓ Desconhecido'}
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

## 🎨 Interface do Usuário

### 1. Marketplace P2P

```typescript
// frontend/src/components/p2p/P2PMarketplace.tsx
import React, { useState, useEffect } from 'react';

export const P2PMarketplace: React.FC = () => {
  const [ads, setAds] = useState([]);
  const [filters, setFilters] = useState({
    asset: '',
    adType: '',
    paymentMethod: '',
    minPrice: '',
    maxPrice: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, [filters]);

  const loadAds = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/p2p/ads?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setAds(data.ads);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (adId: string, amount: number, paymentMethod: string) => {
    try {
      const response = await fetch('/api/p2p/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          amount,
          paymentMethod
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Redirecionar para página da ordem
        window.location.href = `/p2p/orders/${data.orderId}`;
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p2p-marketplace">
      <h2>🔄 Marketplace P2P</h2>
      
      {/* Filtros */}
      <div className="marketplace-filters">
        <div className="filter-group">
          <label>
            Ativo:
            <select
              value={filters.asset}
              onChange={(e) => setFilters({...filters, asset: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="BTC">Bitcoin</option>
              <option value="ETH">Ethereum</option>
              <option value="USDT">Tether</option>
            </select>
          </label>
        </div>
        
        <div className="filter-group">
          <label>
            Tipo:
            <select
              value={filters.adType}
              onChange={(e) => setFilters({...filters, adType: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="buy">Comprando</option>
              <option value="sell">Vendendo</option>
            </select>
          </label>
        </div>
        
        <div className="filter-group">
          <label>
            Método de Pagamento:
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="pix">PIX</option>
              <option value="ted">TED</option>
              <option value="card">Cartão</option>
            </select>
          </label>
        </div>
        
        <div className="filter-group">
          <label>
            Preço Mínimo:
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              placeholder="0.00"
            />
          </label>
        </div>
        
        <div className="filter-group">
          <label>
            Preço Máximo:
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              placeholder="1000000.00"
            />
          </label>
        </div>
      </div>

      {/* Lista de Anúncios */}
      <div className="ads-grid">
        {ads.map(ad => (
          <div key={ad.id} className="ad-card">
            <div className="ad-header">
              <h3>{ad.adType === 'buy' ? '🛒 Comprando' : '💰 Vendendo'} {ad.asset.symbol}</h3>
              <span className="ad-price">${ad.price.toLocaleString()}</span>
            </div>
            
            <div className="ad-details">
              <div className="detail-item">
                <span className="label">Vendedor:</span>
                <span className="value">{ad.user.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Reputação:</span>
                <span className="value">{ad.user.reputationScore}/10</span>
              </div>
              <div className="detail-item">
                <span className="label">Trades:</span>
                <span className="value">{ad.user.totalTrades}</span>
              </div>
              <div className="detail-item">
                <span className="label">Disponível:</span>
                <span className="value">{ad.availableAmount} {ad.asset.symbol}</span>
              </div>
              <div className="detail-item">
                <span className="label">Limite:</span>
                <span className="value">{ad.minAmount} - {ad.maxAmount} {ad.asset.symbol}</span>
              </div>
              <div className="detail-item">
                <span className="label">Pagamento:</span>
                <span className="value">
                  {ad.paymentMethods.map(method => method.name).join(', ')}
                </span>
              </div>
            </div>
            
            <div className="ad-actions">
              <button
                onClick={() => createOrder(ad.id, ad.minAmount, ad.paymentMethods[0].type)}
                className="create-order-button"
              >
                {ad.adType === 'buy' ? 'Vender' : 'Comprar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🔧 APIs do Sistema P2P

### 1. User Management APIs

#### POST /api/p2p/users
Criar usuário P2P

```typescript
interface CreateP2PUserRequest {
  userId?: string;
  email: string;
  phone?: string;
  name: string;
  documentType?: string;
  documentNumber?: string;
  userType: 'platform_user' | 'external_user';
}

interface CreateP2PUserResponse {
  success: boolean;
  p2pUserId?: string;
  message: string;
}
```

#### GET /api/p2p/users/:userId
Obter dados do usuário P2P

```typescript
interface GetP2PUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    userType: string;
    reputationScore: number;
    totalTrades: number;
    successfulTrades: number;
    verificationStatus: string;
    kycLevel: string;
  };
  message: string;
}
```

### 2. Ads Management APIs

#### POST /api/p2p/ads
Criar anúncio P2P

```typescript
interface CreateP2PAdRequest {
  assetId: string;
  adType: 'buy' | 'sell';
  price: number;
  priceType: 'fixed' | 'percentage' | 'market';
  minAmount: number;
  maxAmount: number;
  availableAmount: number;
  paymentMethods: Array<{
    type: string;
    name: string;
    details?: any;
  }>;
  terms?: string;
  autoReply?: string;
  minTradeTime?: number;
  maxTradeTime?: number;
}

interface CreateP2PAdResponse {
  success: boolean;
  adId?: string;
  message: string;
}
```

#### GET /api/p2p/ads
Obter anúncios P2P

```typescript
interface GetP2PAdsRequest {
  asset?: string;
  adType?: string;
  paymentMethod?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

interface GetP2PAdsResponse {
  success: boolean;
  ads?: Array<{
    id: string;
    user: any;
    asset: any;
    adType: string;
    price: number;
    priceType: string;
    minAmount: number;
    maxAmount: number;
    availableAmount: number;
    paymentMethods: any[];
    terms?: string;
    completionRate: number;
    totalTrades: number;
    views: number;
    createdAt: string;
  }>;
  message: string;
}
```

### 3. Orders Management APIs

#### POST /api/p2p/orders
Criar ordem P2P

```typescript
interface CreateP2POrderRequest {
  adId: string;
  amount: number;
  paymentMethod: string;
  paymentDetails?: any;
  buyerMessage?: string;
}

interface CreateP2POrderResponse {
  success: boolean;
  orderId?: string;
  message: string;
}
```

#### GET /api/p2p/orders/:orderId
Obter dados da ordem

```typescript
interface GetP2POrderResponse {
  success: boolean;
  order?: {
    id: string;
    ad: any;
    buyer: any;
    seller: any;
    asset: any;
    amount: number;
    price: number;
    totalValue: number;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
    paymentMethod: string;
    paymentDetails: any;
    orderStatus: string;
    escrowStatus: string;
    tradeTimeLimit: number;
    paymentDeadline: string;
    confirmationDeadline: string;
    autoReleaseTime: string;
    buyerMessage?: string;
    sellerMessage?: string;
    createdAt: string;
  };
  message: string;
}
```

### 4. Configuration APIs

#### GET /api/p2p/configuration
Obter configuração P2P

```typescript
interface GetP2PConfigurationResponse {
  success: boolean;
  config?: {
    defaultCommissionRate: number;
    maxAdsPlatformUser: number;
    maxAdsExternalUser: number;
    minTradeTime: number;
    maxTradeTime: number;
    autoReleaseTime: number;
    disputeResolutionTime: number;
    kycRequired: boolean;
    verificationRequired: boolean;
  };
  message: string;
}
```

#### PUT /api/p2p/configuration
Atualizar configuração P2P

```typescript
interface UpdateP2PConfigurationRequest {
  defaultCommissionRate?: number;
  maxAdsPlatformUser?: number;
  maxAdsExternalUser?: number;
  minTradeTime?: number;
  maxTradeTime?: number;
  autoReleaseTime?: number;
  disputeResolutionTime?: number;
  kycRequired?: boolean;
  verificationRequired?: boolean;
}

interface UpdateP2PConfigurationResponse {
  success: boolean;
  message: string;
}
```

## 🧪 Testes do Sistema

### 1. Testes de Marketplace

```typescript
// tests/unit/p2p/p2p-marketplace.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { P2PMarketplaceManager } from '../../src/p2p/p2p-marketplace-manager';
import { prisma } from '../setup';

describe('P2P Marketplace', () => {
  let marketplaceManager: P2PMarketplaceManager;

  beforeEach(() => {
    marketplaceManager = new P2PMarketplaceManager();
  });

  describe('createP2PUser', () => {
    it('should create platform user successfully', async () => {
      const result = await marketplaceManager.createP2PUser({
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        userType: 'platform_user'
      }, { userId: 'admin_123' });

      expect(result.success).toBe(true);
      expect(result.p2pUserId).toBeDefined();
    });

    it('should create external user successfully', async () => {
      const result = await marketplaceManager.createP2PUser({
        email: 'external@example.com',
        name: 'External User',
        userType: 'external_user'
      }, { userId: 'admin_123' });

      expect(result.success).toBe(true);
      expect(result.p2pUserId).toBeDefined();
    });

    it('should reject blacklisted user', async () => {
      // Adicionar usuário à blacklist
      await prisma.p2pBlacklist.create({
        data: {
          email: 'blacklisted@example.com',
          reason: 'Fraudulent activity',
          blacklistType: 'email',
          createdBy: 'admin_123'
        }
      });

      const result = await marketplaceManager.createP2PUser({
        email: 'blacklisted@example.com',
        name: 'Blacklisted User',
        userType: 'external_user'
      }, { userId: 'admin_123' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('blacklisted');
    });
  });

  describe('createAd', () => {
    it('should create ad successfully', async () => {
      const p2pUser = await prisma.p2pUser.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          userType: 'platform_user'
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto'
        }
      });

      const result = await marketplaceManager.createAd(p2pUser.id, {
        assetId: asset.id,
        adType: 'sell',
        price: 50000,
        priceType: 'fixed',
        minAmount: 0.001,
        maxAmount: 1.0,
        availableAmount: 1.0,
        paymentMethods: [
          { type: 'pix', name: 'PIX' },
          { type: 'ted', name: 'TED' }
        ],
        terms: 'Payment within 15 minutes'
      }, { userId: 'admin_123' });

      expect(result.success).toBe(true);
      expect(result.adId).toBeDefined();
    });
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const p2pUser = await prisma.p2pUser.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          userType: 'platform_user'
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto'
        }
      });

      const ad = await prisma.p2pAd.create({
        data: {
          userId: p2pUser.id,
          assetId: asset.id,
          adType: 'sell',
          price: 50000,
          priceType: 'fixed',
          minAmount: 0.001,
          maxAmount: 1.0,
          availableAmount: 1.0,
          paymentMethods: [{ type: 'pix', name: 'PIX' }]
        }
      });

      const result = await marketplaceManager.createOrder(ad.id, p2pUser.id, {
        amount: 0.01,
        paymentMethod: 'pix',
        buyerMessage: 'Test order'
      }, { userId: 'admin_123' });

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Sistema P2P Completo
- [ ] P2P Marketplace Manager
- [ ] Order Management System
- [ ] Escrow System
- [ ] Payment Gateway Integration
- [ ] Dispute Resolution System
- [ ] P2P Dashboard
- [ ] External User Management
- [ ] Commission Engine
- [ ] Security Validator
- [ ] Notification System

### ✅ Funcionalidades Implementadas
- [ ] Criação de usuários P2P (plataforma e externos)
- [ ] Sistema de anúncios flexível
- [ ] Criação e gestão de ordens
- [ ] Sistema de escrow automático
- [ ] Múltiplos métodos de pagamento
- [ ] Sistema de reputação
- [ ] Resolução de disputas
- [ ] Dashboard exclusivo P2P
- [ ] Comissão configurável (10% padrão)
- [ ] Sistema de blacklist

### ✅ Segurança e Validação
- [ ] Verificação de usuários
- [ ] Validação de limites
- [ ] Sistema de escrow seguro
- [ ] Auditoria completa
- [ ] Sistema de disputas
- [ ] Blacklist de usuários
- [ ] Validação de pagamentos

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO