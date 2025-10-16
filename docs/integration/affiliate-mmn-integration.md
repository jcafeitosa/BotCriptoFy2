# Integração Affiliate System + MMN - BotCriptoFy2

## 🔗 Visão Geral

Integração completa entre o Sistema de Afiliados e o Sistema MMN (Multi-Level Marketing), garantindo que toda a estrutura hierárquica seja mantida e que as comissões sejam calculadas corretamente baseadas na árvore MMN.

## 🏗️ Arquitetura da Integração

### Componentes de Integração
- **Affiliate-MMN Bridge**: Ponte entre os sistemas
- **Tree Synchronizer**: Sincronizador de árvore
- **Commission Mapper**: Mapeador de comissões
- **Event Coordinator**: Coordenador de eventos
- **Data Validator**: Validador de dados

### Fluxo de Integração
1. **Registro de Afiliado**: Criar nó na árvore MMN
2. **Criação de Convite**: Sincronizar com sistema de convites
3. **Aceitação de Convite**: Adicionar à árvore MMN
4. **Revogação de Convite**: Reconectar sub-árvore à raiz
5. **Cálculo de Comissão**: Usar estrutura MMN para cálculo

## 🔧 Implementação da Integração

### 1. Affiliate-MMN Bridge

```typescript
// backend/src/integration/affiliate-mmn-bridge.ts
import { prisma } from '../db';
import { TreeManager } from '../mmn/tree-manager';
import { ReconnectionEngine } from '../mmn/reconnection-engine';
import { CommissionCalculator } from '../affiliate/commission-calculator';

export class AffiliateMMNBridge {
  private treeManager: TreeManager;
  private reconnectionEngine: ReconnectionEngine;
  private commissionCalculator: CommissionCalculator;

  constructor() {
    this.treeManager = new TreeManager();
    this.reconnectionEngine = new ReconnectionEngine();
    this.commissionCalculator = new CommissionCalculator();
  }

  async registerAffiliate(
    userId: string,
    userType: 'trader' | 'influencer' | 'partner',
    inviteCode?: string
  ): Promise<{
    success: boolean;
    affiliateId?: string;
    nodeId?: string;
    message: string;
  }> {
    try {
      // 1. Criar afiliado no sistema de afiliados
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId,
          tenantId: 'main-tenant', // Assumindo tenant principal
          affiliateCode: await this.generateAffiliateCode(),
          userType,
          inviteLimit: userType === 'trader' ? 5 : null,
          isActive: true
        }
      });

      // 2. Buscar árvore principal
      const tree = await prisma.mmnTree.findFirst({
        where: { isActive: true }
      });

      if (!tree) {
        // Criar árvore principal se não existir
        const ceo = await prisma.user.findFirst({
          where: { email: 'jcafeitosa@icloud.com' } // CEO
        });

        if (!ceo) {
          throw new Error('CEO user not found');
        }

        const treeResult = await this.treeManager.createTree(
          'Main Affiliate Tree',
          ceo.id
        );

        if (!treeResult.success) {
          throw new Error('Failed to create main tree');
        }

        tree.id = treeResult.treeId!;
      }

      // 3. Adicionar à árvore MMN
      let nodeId: string;

      if (inviteCode) {
        // Adicionar como filho do convite
        const invite = await prisma.affiliateInvite.findUnique({
          where: { inviteCode }
        });

        if (!invite) {
          throw new Error('Invalid invite code');
        }

        const inviteNode = await prisma.mmnNode.findFirst({
          where: {
            userId: invite.affiliateUserId,
            treeId: tree.id,
            isActive: true
          }
        });

        if (!inviteNode) {
          throw new Error('Invite node not found in tree');
        }

        const addNodeResult = await this.treeManager.addNode(
          tree.id,
          userId,
          inviteNode.id
        );

        if (!addNodeResult.success) {
          throw new Error('Failed to add node to tree');
        }

        nodeId = addNodeResult.nodeId!;

        // Atualizar convite
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

      } else {
        // Adicionar diretamente à raiz (CEO)
        const rootNode = await prisma.mmnNode.findFirst({
          where: {
            treeId: tree.id,
            level: 0,
            isActive: true
          }
        });

        if (!rootNode) {
          throw new Error('Root node not found');
        }

        const addNodeResult = await this.treeManager.addNode(
          tree.id,
          userId,
          rootNode.id
        );

        if (!addNodeResult.success) {
          throw new Error('Failed to add node to tree');
        }

        nodeId = addNodeResult.nodeId!;
      }

      return {
        success: true,
        affiliateId: affiliate.id,
        nodeId,
        message: 'Affiliate registered successfully'
      };

    } catch (error) {
      console.error('Error registering affiliate:', error);
      return {
        success: false,
        message: 'Failed to register affiliate'
      };
    }
  }

  async revokeInvite(
    inviteId: string,
    affiliateUserId: string
  ): Promise<{
    success: boolean;
    reconnectedNodes?: string[];
    message: string;
  }> {
    try {
      // 1. Buscar convite
      const invite = await prisma.affiliateInvite.findUnique({
        where: { id: inviteId },
        include: {
          invitedUser: true
        }
      });

      if (!invite) {
        return { success: false, message: 'Invite not found' };
      }

      if (invite.affiliateUserId !== affiliateUserId) {
        return { success: false, message: 'Unauthorized to revoke this invite' };
      }

      // 2. Buscar nó na árvore MMN
      const tree = await prisma.mmnTree.findFirst({
        where: { isActive: true }
      });

      if (!tree) {
        return { success: false, message: 'Main tree not found' };
      }

      const inviteNode = await prisma.mmnNode.findFirst({
        where: {
          userId: invite.invitedUserId,
          treeId: tree.id,
          isActive: true
        }
      });

      if (!inviteNode) {
        return { success: false, message: 'Invite node not found in tree' };
      }

      // 3. Reconectar sub-árvore à raiz
      const reconnectionResult = await this.reconnectionEngine.reconnectSubtree(
        tree.id,
        inviteNode.id
      );

      if (!reconnectionResult.success) {
        return { success: false, message: 'Failed to reconnect subtree' };
      }

      // 4. Revogar convite
      await prisma.affiliateInvite.update({
        where: { id: inviteId },
        data: {
          status: 'revoked',
          revokedAt: new Date()
        }
      });

      // 5. Remover relacionamento de afiliado
      await prisma.affiliateRelationship.deleteMany({
        where: { inviteId }
      });

      return {
        success: true,
        reconnectedNodes: reconnectionResult.reconnectedNodes,
        message: 'Invite revoked and subtree reconnected to root'
      };

    } catch (error) {
      console.error('Error revoking invite:', error);
      return { success: false, message: 'Failed to revoke invite' };
    }
  }

  async calculateCommission(
    transactionId: string,
    referredUserId: string,
    baseAmount: number,
    platformCommission: number
  ): Promise<{
    success: boolean;
    commissions?: any[];
    totalDistributed?: number;
    message: string;
  }> {
    try {
      // 1. Buscar árvore principal
      const tree = await prisma.mmnTree.findFirst({
        where: { isActive: true }
      });

      if (!tree) {
        return { success: false, message: 'Main tree not found' };
      }

      // 2. Buscar nó do usuário referido
      const referredNode = await prisma.mmnNode.findFirst({
        where: {
          userId: referredUserId,
          treeId: tree.id,
          isActive: true
        }
      });

      if (!referredNode) {
        return { success: false, message: 'Referred user not found in tree' };
      }

      // 3. Buscar cadeia de afiliados na árvore MMN
      const affiliateChain = await this.getAffiliateChainFromTree(
        referredNode,
        tree.id
      );

      if (affiliateChain.length === 0) {
        return { success: false, message: 'No affiliate chain found' };
      }

      // 4. Calcular comissões usando a cadeia da árvore MMN
      const commissions = this.commissionCalculator.calculateMultiLevelCommission(
        affiliateChain,
        baseAmount,
        platformCommission
      );

      // 5. Criar registros de comissão
      const commissionRecords = [];
      for (const commission of commissions) {
        const record = await prisma.affiliateCommission.create({
          data: {
            affiliateUserId: commission.userId,
            referredUserId,
            level: commission.level,
            transactionId,
            commissionAmount: commission.commissionAmount,
            commissionPercentage: commission.commissionPercentage,
            baseAmount,
            status: 'pending'
          }
        });

        commissionRecords.push(record);

        // Atualizar total de ganhos do afiliado
        await prisma.affiliateUser.update({
          where: { id: commission.userId },
          data: {
            totalEarnings: {
              increment: commission.commissionAmount
            }
          }
        });
      }

      return {
        success: true,
        commissions: commissionRecords,
        totalDistributed: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        message: 'Commissions calculated and distributed successfully'
      };

    } catch (error) {
      console.error('Error calculating commission:', error);
      return { success: false, message: 'Failed to calculate commission' };
    }
  }

  private async getAffiliateChainFromTree(
    node: any,
    treeId: string
  ): Promise<Array<{
    userId: string;
    userType: string;
    level: number;
  }>> {
    const chain = [];
    let currentNode = node;
    let level = 1;

    while (currentNode && level <= 5) {
      // Buscar afiliado correspondente
      const affiliate = await prisma.affiliateUser.findFirst({
        where: {
          userId: currentNode.userId,
          isActive: true
        }
      });

      if (affiliate) {
        chain.push({
          userId: affiliate.id,
          userType: affiliate.userType,
          level
        });
      }

      // Buscar nó pai
      const parentNode = await prisma.mmnNode.findUnique({
        where: { id: currentNode.parentNodeId || '' }
      });

      if (!parentNode || parentNode.level === 0) {
        break;
      }

      currentNode = parentNode;
      level++;
    }

    return chain;
  }

  private async generateAffiliateCode(): Promise<string> {
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await prisma.affiliateUser.findUnique({
        where: { affiliateCode: code }
      });
      isUnique = !existing;
    }

    return code!;
  }
}
```

### 2. Tree Synchronizer

```typescript
// backend/src/integration/tree-synchronizer.ts
export class TreeSynchronizer {
  async synchronizeAffiliateWithTree(
    affiliateId: string,
    treeId: string
  ): Promise<{
    success: boolean;
    nodeId?: string;
    message: string;
  }> {
    try {
      const affiliate = await prisma.affiliateUser.findUnique({
        where: { id: affiliateId },
        include: { user: true }
      });

      if (!affiliate) {
        return { success: false, message: 'Affiliate not found' };
      }

      // Verificar se já existe nó na árvore
      const existingNode = await prisma.mmnNode.findFirst({
        where: {
          userId: affiliate.userId,
          treeId,
          isActive: true
        }
      });

      if (existingNode) {
        return {
          success: true,
          nodeId: existingNode.id,
          message: 'Node already exists in tree'
        };
      }

      // Buscar nó raiz
      const rootNode = await prisma.mmnNode.findFirst({
        where: {
          treeId,
          level: 0,
          isActive: true
        }
      });

      if (!rootNode) {
        return { success: false, message: 'Root node not found' };
      }

      // Adicionar nó à árvore
      const treeManager = new TreeManager();
      const result = await treeManager.addNode(
        treeId,
        affiliate.userId,
        rootNode.id
      );

      return {
        success: result.success,
        nodeId: result.nodeId,
        message: result.message
      };

    } catch (error) {
      console.error('Error synchronizing affiliate with tree:', error);
      return { success: false, message: 'Failed to synchronize' };
    }
  }

  async synchronizeTreeWithAffiliates(
    treeId: string
  ): Promise<{
    success: boolean;
    synchronizedNodes: string[];
    message: string;
  }> {
    try {
      // Buscar todos os afiliados ativos
      const affiliates = await prisma.affiliateUser.findMany({
        where: { isActive: true },
        include: { user: true }
      });

      const synchronizedNodes = [];

      for (const affiliate of affiliates) {
        // Verificar se existe nó na árvore
        const existingNode = await prisma.mmnNode.findFirst({
          where: {
            userId: affiliate.userId,
            treeId,
            isActive: true
          }
        });

        if (!existingNode) {
          // Sincronizar afiliado com árvore
          const result = await this.synchronizeAffiliateWithTree(
            affiliate.id,
            treeId
          );

          if (result.success && result.nodeId) {
            synchronizedNodes.push(result.nodeId);
          }
        }
      }

      return {
        success: true,
        synchronizedNodes,
        message: `Synchronized ${synchronizedNodes.length} nodes`
      };

    } catch (error) {
      console.error('Error synchronizing tree with affiliates:', error);
      return { success: false, synchronizedNodes: [], message: 'Failed to synchronize' };
    }
  }
}
```

### 3. Event Coordinator

```typescript
// backend/src/integration/event-coordinator.ts
export class EventCoordinator {
  async handleAffiliateEvent(
    eventType: string,
    data: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      switch (eventType) {
        case 'affiliate_registered':
          await this.handleAffiliateRegistered(data);
          break;
        case 'invite_created':
          await this.handleInviteCreated(data);
          break;
        case 'invite_accepted':
          await this.handleInviteAccepted(data);
          break;
        case 'invite_revoked':
          await this.handleInviteRevoked(data);
          break;
        case 'commission_calculated':
          await this.handleCommissionCalculated(data);
          break;
        default:
          console.log(`Unknown event type: ${eventType}`);
      }

      return { success: true, message: 'Event handled successfully' };

    } catch (error) {
      console.error('Error handling affiliate event:', error);
      return { success: false, message: 'Failed to handle event' };
    }
  }

  private async handleAffiliateRegistered(data: any) {
    // Sincronizar afiliado com árvore MMN
    const synchronizer = new TreeSynchronizer();
    await synchronizer.synchronizeAffiliateWithTree(data.affiliateId, data.treeId);
  }

  private async handleInviteCreated(data: any) {
    // Registrar evento na árvore MMN
    await prisma.mmnTreeEvent.create({
      data: {
        treeId: data.treeId,
        eventType: 'invite_created',
        nodeId: data.nodeId,
        eventData: {
          inviteId: data.inviteId,
          inviteCode: data.inviteCode
        }
      }
    });
  }

  private async handleInviteAccepted(data: any) {
    // Adicionar nó à árvore MMN
    const treeManager = new TreeManager();
    await treeManager.addNode(data.treeId, data.userId, data.parentNodeId);
  }

  private async handleInviteRevoked(data: any) {
    // Reconectar sub-árvore à raiz
    const reconnectionEngine = new ReconnectionEngine();
    await reconnectionEngine.reconnectSubtree(data.treeId, data.nodeId);
  }

  private async handleCommissionCalculated(data: any) {
    // Registrar evento de comissão na árvore MMN
    await prisma.mmnTreeEvent.create({
      data: {
        treeId: data.treeId,
        eventType: 'commission_calculated',
        eventData: {
          transactionId: data.transactionId,
          totalCommissions: data.totalCommissions,
          affectedNodes: data.affectedNodes
        }
      }
    });
  }
}
```

## 📊 APIs de Integração

### 1. Integration APIs

#### POST /api/integration/affiliate-mmn/register
Registrar afiliado com integração MMN

```typescript
interface RegisterAffiliateMMNRequest {
  userId: string;
  userType: 'trader' | 'influencer' | 'partner';
  inviteCode?: string;
}

interface RegisterAffiliateMMNResponse {
  success: boolean;
  affiliateId?: string;
  nodeId?: string;
  message: string;
}
```

#### POST /api/integration/affiliate-mmn/revoke-invite
Revogar convite com reconexão MMN

```typescript
interface RevokeInviteMMNRequest {
  inviteId: string;
  affiliateUserId: string;
}

interface RevokeInviteMMNResponse {
  success: boolean;
  reconnectedNodes?: string[];
  message: string;
}
```

#### POST /api/integration/affiliate-mmn/calculate-commission
Calcular comissão usando árvore MMN

```typescript
interface CalculateCommissionMMNRequest {
  transactionId: string;
  referredUserId: string;
  baseAmount: number;
  platformCommission: number;
}

interface CalculateCommissionMMNResponse {
  success: boolean;
  commissions?: any[];
  totalDistributed?: number;
  message: string;
}
```

### 2. Synchronization APIs

#### POST /api/integration/affiliate-mmn/sync-tree
Sincronizar árvore com afiliados

```typescript
interface SyncTreeResponse {
  success: boolean;
  synchronizedNodes: string[];
  message: string;
}
```

#### GET /api/integration/affiliate-mmn/tree-structure
Obter estrutura da árvore com dados de afiliados

```typescript
interface TreeStructureWithAffiliatesResponse {
  nodes: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    level: number;
    position: number;
    path: string;
    isLeaf: boolean;
    affiliate: {
      id: string;
      affiliateCode: string;
      userType: string;
      totalEarnings: number;
      totalCommissionsPaid: number;
    };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    levelDistance: number;
  }[];
  summary: {
    totalNodes: number;
    totalAffiliates: number;
    maxDepth: number;
    totalEarnings: number;
  };
}
```

## 🧪 Testes de Integração

### Testes Unitários

```typescript
// tests/unit/integration/affiliate-mmn-bridge.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AffiliateMMNBridge } from '../../src/integration/affiliate-mmn-bridge';
import { prisma } from '../setup';

describe('AffiliateMMNBridge', () => {
  let bridge: AffiliateMMNBridge;

  beforeEach(() => {
    bridge = new AffiliateMMNBridge();
  });

  describe('registerAffiliate', () => {
    it('should register affiliate and create node in tree', async () => {
      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Criar CEO
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      // Criar árvore
      const tree = await prisma.mmnTree.create({
        data: {
          name: 'Test Tree',
          rootUserId: ceo.id,
          maxDepth: 5
        }
      });

      const rootNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: ceo.id,
          level: 0,
          position: 0,
          path: '0',
          isActive: true,
          isLeaf: false
        }
      });

      const result = await bridge.registerAffiliate(user.id, 'trader');

      expect(result.success).toBe(true);
      expect(result.affiliateId).toBeDefined();
      expect(result.nodeId).toBeDefined();

      // Verificar se afiliado foi criado
      const affiliate = await prisma.affiliateUser.findUnique({
        where: { id: result.affiliateId! }
      });

      expect(affiliate).toBeDefined();
      expect(affiliate?.userId).toBe(user.id);
      expect(affiliate?.userType).toBe('trader');

      // Verificar se nó foi criado na árvore
      const node = await prisma.mmnNode.findUnique({
        where: { id: result.nodeId! }
      });

      expect(node).toBeDefined();
      expect(node?.userId).toBe(user.id);
      expect(node?.parentNodeId).toBe(rootNode.id);
    });
  });

  describe('revokeInvite', () => {
    it('should revoke invite and reconnect subtree to root', async () => {
      // Criar estrutura de teste
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      const affiliate = await prisma.user.create({
        data: {
          email: 'affiliate@example.com',
          name: 'Affiliate User'
        }
      });

      const referred = await prisma.user.create({
        data: {
          email: 'referred@example.com',
          name: 'Referred User'
        }
      });

      // Criar árvore
      const tree = await prisma.mmnTree.create({
        data: {
          name: 'Test Tree',
          rootUserId: ceo.id,
          maxDepth: 5
        }
      });

      const rootNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: ceo.id,
          level: 0,
          position: 0,
          path: '0',
          isActive: true,
          isLeaf: false
        }
      });

      const affiliateNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: affiliate.id,
          parentNodeId: rootNode.id,
          level: 1,
          position: 0,
          path: '0.0',
          isActive: true,
          isLeaf: false
        }
      });

      const referredNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: referred.id,
          parentNodeId: affiliateNode.id,
          level: 2,
          position: 0,
          path: '0.0.0',
          isActive: true,
          isLeaf: true
        }
      });

      // Criar afiliado e convite
      const affiliateUser = await prisma.affiliateUser.create({
        data: {
          userId: affiliate.id,
          tenantId: 'main-tenant',
          affiliateCode: 'AFF001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const invite = await prisma.affiliateInvite.create({
        data: {
          affiliateUserId: affiliateUser.id,
          invitedUserId: referred.id,
          inviteCode: 'INV001',
          inviteUrl: 'https://example.com/invite/INV001',
          status: 'accepted',
          acceptedAt: new Date()
        }
      });

      // Revogar convite
      const result = await bridge.revokeInvite(invite.id, affiliateUser.id);

      expect(result.success).toBe(true);
      expect(result.reconnectedNodes).toContain(referredNode.id);

      // Verificar se nó referido foi reconectado à raiz
      const updatedReferredNode = await prisma.mmnNode.findUnique({
        where: { id: referredNode.id }
      });

      expect(updatedReferredNode?.parentNodeId).toBe(rootNode.id);
      expect(updatedReferredNode?.level).toBe(1);
    });
  });
});
```

## 📋 Checklist de Integração

### ✅ Configuração Inicial
- [ ] Criar bridge de integração
- [ ] Configurar sincronizador
- [ ] Configurar coordenador de eventos
- [ ] Configurar validações

### ✅ Funcionalidades
- [ ] Registro de afiliado com MMN
- [ ] Revogação de convite com reconexão
- [ ] Cálculo de comissão usando árvore
- [ ] Sincronização de dados

### ✅ APIs
- [ ] APIs de integração
- [ ] APIs de sincronização
- [ ] APIs de estrutura
- [ ] APIs de eventos

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de sincronização
- [ ] Testes de reconexão

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO