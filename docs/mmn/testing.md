# Testes do Sistema MMN - BotCriptoFy2

## 🧪 Visão Geral

Estratégia completa de testes para o Sistema MMN (Multi-Level Marketing), incluindo testes unitários, integração, E2E e testes de performance para garantir a integridade da árvore hierárquica.

## 📋 Estratégia de Testes

### Pirâmide de Testes para MMN
- **Testes Unitários**: 50% - Lógica de árvore, reconexão, validação
- **Testes de Integração**: 35% - APIs, banco de dados, sincronização
- **Testes E2E**: 15% - Fluxos completos de árvore

### Tipos de Testes
- **Unitários**: Classes e funções individuais
- **Integração**: APIs e banco de dados
- **E2E**: Fluxos completos de árvore
- **Performance**: Carga e stress testing
- **Concorrência**: Testes de concorrência
- **Reconexão**: Testes de reconexão automática

## 🛠️ Stack de Testes

### Backend (Elysia)
- **Framework**: Bun Test
- **Assertions**: Bun built-in assertions
- **Mocks**: Mock Service Worker
- **Coverage**: c8
- **Database**: Testcontainers

### Mocks e Fixtures
- **Tree Mocks**: Simulação de estruturas de árvore
- **Node Mocks**: Simulação de nós da árvore
- **Event Mocks**: Simulação de eventos de árvore
- **Database Fixtures**: Dados de teste para árvores

## 🏗️ Estrutura de Testes

```
tests/
├── unit/                           # Testes unitários
│   ├── tree-manager.test.ts       # Gerenciador de árvore
│   ├── tree-analyzer.test.ts      # Analisador de árvore
│   ├── tree-rebalancer.test.ts    # Rebalanceador de árvore
│   ├── reconnection-engine.test.ts # Motor de reconexão
│   └── tree-traverser.test.ts     # Percursor de árvore
├── integration/                    # Testes de integração
│   ├── mmn-apis.test.ts          # APIs do MMN
│   ├── tree-synchronization.test.ts # Sincronização de árvore
│   ├── affiliate-mmn-bridge.test.ts # Bridge de integração
│   └── event-coordination.test.ts # Coordenação de eventos
├── e2e/                           # Testes end-to-end
│   ├── tree-creation-flows.test.ts # Fluxos de criação
│   ├── tree-reconnection-flows.test.ts # Fluxos de reconexão
│   └── tree-performance-flows.test.ts # Fluxos de performance
├── performance/                   # Testes de performance
│   ├── tree-load-testing.test.ts  # Testes de carga
│   ├── tree-stress-testing.test.ts # Testes de stress
│   └── tree-concurrency.test.ts   # Testes de concorrência
├── fixtures/                      # Dados de teste
│   ├── trees.json                 # Dados de árvore
│   ├── nodes.json                 # Dados de nós
│   └── events.json                # Dados de eventos
└── mocks/                         # Mocks e simulações
    ├── tree-mock.ts               # Mock de árvore
    ├── node-mock.ts               # Mock de nó
    └── event-mock.ts              # Mock de evento
```

## 🔧 Configuração de Testes

### 1. Setup de Testes

```typescript
// tests/setup/mmn-setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Setup database de teste
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  // Setup Redis de teste
  redis = new Redis(process.env.TEST_REDIS_URL);

  // Executar migrações de teste
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test`;
  await prisma.$executeRaw`SET search_path TO test`;
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Limpar dados de teste
  await prisma.mmnTreeEvent.deleteMany();
  await prisma.mmnNodeRelationship.deleteMany();
  await prisma.mmnNode.deleteMany();
  await prisma.mmnTree.deleteMany();
  await prisma.affiliateUser.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
});

export { prisma, redis };
```

### 2. Mocks do Sistema MMN

```typescript
// tests/mocks/tree-mock.ts
export class TreeMock {
  static createTreeData = {
    id: 'tree_123456789',
    name: 'Test Tree',
    rootUserId: 'user_123456789',
    maxDepth: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  static createNodeData = {
    id: 'node_123456789',
    treeId: 'tree_123456789',
    userId: 'user_123456789',
    parentNodeId: null,
    level: 0,
    position: 0,
    path: '0',
    isActive: true,
    isLeaf: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  static createTreeStructure = {
    nodes: [
      {
        id: 'node_1',
        userId: 'user_1',
        level: 0,
        position: 0,
        path: '0',
        isLeaf: false
      },
      {
        id: 'node_2',
        userId: 'user_2',
        level: 1,
        position: 0,
        path: '0.0',
        isLeaf: false
      },
      {
        id: 'node_3',
        userId: 'user_3',
        level: 1,
        position: 1,
        path: '0.1',
        isLeaf: true
      },
      {
        id: 'node_4',
        userId: 'user_4',
        level: 2,
        position: 0,
        path: '0.0.0',
        isLeaf: true
      }
    ],
    edges: [
      { source: 'node_1', target: 'node_2', type: 'direct' },
      { source: 'node_1', target: 'node_3', type: 'direct' },
      { source: 'node_2', target: 'node_4', type: 'direct' }
    ]
  };

  static createReconnectionEvent = {
    id: 'event_123456789',
    treeId: 'tree_123456789',
    eventType: 'subtree_reconnected',
    nodeId: 'node_2',
    parentNodeId: 'node_1',
    affectedNodes: ['node_4'],
    eventData: {
      removedNodeId: 'node_2',
      reconnectedNodes: ['node_4'],
      rootNodeId: 'node_1',
      timestamp: new Date(),
      reason: 'invite_revoked'
    },
    createdAt: new Date()
  };
}
```

## 🧪 Testes Unitários

### 1. Tree Manager

```typescript
// tests/unit/mmn/tree-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { TreeManager } from '../../src/mmn/tree-manager';
import { prisma } from '../setup';

describe('TreeManager', () => {
  let treeManager: TreeManager;

  beforeEach(() => {
    treeManager = new TreeManager();
  });

  describe('createTree', () => {
    it('should create tree with CEO as root', async () => {
      // Criar CEO
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      const result = await treeManager.createTree('Main Tree', ceo.id);

      expect(result.success).toBe(true);
      expect(result.treeId).toBeDefined();

      // Verificar se a árvore foi criada
      const tree = await prisma.mmnTree.findUnique({
        where: { id: result.treeId! }
      });

      expect(tree).toBeDefined();
      expect(tree?.rootUserId).toBe(ceo.id);
      expect(tree?.name).toBe('Main Tree');

      // Verificar se o nó raiz foi criado
      const rootNode = await prisma.mmnNode.findFirst({
        where: {
          treeId: result.treeId!,
          level: 0
        }
      });

      expect(rootNode).toBeDefined();
      expect(rootNode?.userId).toBe(ceo.id);
      expect(rootNode?.path).toBe('0');
    });

    it('should not create tree with invalid CEO', async () => {
      const result = await treeManager.createTree('Main Tree', 'invalid-user-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('CEO user not found');
    });
  });

  describe('addNode', () => {
    it('should add node to tree', async () => {
      // Criar árvore
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      const result = await treeManager.addNode(tree.id, user.id, rootNode.id);

      expect(result.success).toBe(true);
      expect(result.nodeId).toBeDefined();

      // Verificar se o nó foi criado
      const node = await prisma.mmnNode.findUnique({
        where: { id: result.nodeId! }
      });

      expect(node).toBeDefined();
      expect(node?.userId).toBe(user.id);
      expect(node?.level).toBe(1);
      expect(node?.parentNodeId).toBe(rootNode.id);
      expect(node?.path).toBe('0.0');
    });

    it('should not add node when tree depth limit reached', async () => {
      // Criar árvore com profundidade máxima
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      const tree = await prisma.mmnTree.create({
        data: {
          name: 'Test Tree',
          rootUserId: ceo.id,
          maxDepth: 1 // Profundidade máxima 1
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

      // Criar nó no nível 1
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@example.com',
          name: 'User 1'
        }
      });

      const node1 = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: user1.id,
          parentNodeId: rootNode.id,
          level: 1,
          position: 0,
          path: '0.0',
          isActive: true,
          isLeaf: false
        }
      });

      // Tentar adicionar nó no nível 2
      const user2 = await prisma.user.create({
        data: {
          email: 'user2@example.com',
          name: 'User 2'
        }
      });

      const result = await treeManager.addNode(tree.id, user2.id, node1.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum depth reached');
    });
  });

  describe('removeNode', () => {
    it('should remove node and reconnect descendants to root', async () => {
      // Criar árvore com estrutura
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      // Criar nó intermediário
      const intermediateUser = await prisma.user.create({
        data: {
          email: 'intermediate@example.com',
          name: 'Intermediate User'
        }
      });

      const intermediateNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: intermediateUser.id,
          parentNodeId: rootNode.id,
          level: 1,
          position: 0,
          path: '0.0',
          isActive: true,
          isLeaf: false
        }
      });

      // Criar nó filho
      const childUser = await prisma.user.create({
        data: {
          email: 'child@example.com',
          name: 'Child User'
        }
      });

      const childNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: childUser.id,
          parentNodeId: intermediateNode.id,
          level: 2,
          position: 0,
          path: '0.0.0',
          isActive: true,
          isLeaf: true
        }
      });

      // Remover nó intermediário
      const result = await treeManager.removeNode(tree.id, intermediateNode.id);

      expect(result.success).toBe(true);
      expect(result.affectedNodes).toContain(intermediateNode.id);
      expect(result.affectedNodes).toContain(childNode.id);

      // Verificar se o nó filho foi reconectado à raiz
      const updatedChildNode = await prisma.mmnNode.findUnique({
        where: { id: childNode.id }
      });

      expect(updatedChildNode?.parentNodeId).toBe(rootNode.id);
      expect(updatedChildNode?.level).toBe(1);
      expect(updatedChildNode?.path).toMatch(/^0\.\d+$/);
    });
  });
});
```

### 2. Reconnection Engine

```typescript
// tests/unit/mmn/reconnection-engine.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { ReconnectionEngine } from '../../src/mmn/reconnection-engine';
import { prisma } from '../setup';

describe('ReconnectionEngine', () => {
  let reconnectionEngine: ReconnectionEngine;

  beforeEach(() => {
    reconnectionEngine = new ReconnectionEngine();
  });

  describe('reconnectSubtree', () => {
    it('should reconnect subtree to root when node is removed', async () => {
      // Criar árvore com estrutura
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      // Criar nó intermediário
      const intermediateUser = await prisma.user.create({
        data: {
          email: 'intermediate@example.com',
          name: 'Intermediate User'
        }
      });

      const intermediateNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: intermediateUser.id,
          parentNodeId: rootNode.id,
          level: 1,
          position: 0,
          path: '0.0',
          isActive: true,
          isLeaf: false
        }
      });

      // Criar nó filho
      const childUser = await prisma.user.create({
        data: {
          email: 'child@example.com',
          name: 'Child User'
        }
      });

      const childNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: childUser.id,
          parentNodeId: intermediateNode.id,
          level: 2,
          position: 0,
          path: '0.0.0',
          isActive: true,
          isLeaf: true
        }
      });

      // Reconectar sub-árvore
      const result = await reconnectionEngine.reconnectSubtree(
        tree.id,
        intermediateNode.id
      );

      expect(result.success).toBe(true);
      expect(result.reconnectedNodes).toContain(childNode.id);
      expect(result.newStructure).toBeDefined();

      // Verificar se o nó filho foi reconectado à raiz
      const updatedChildNode = await prisma.mmnNode.findUnique({
        where: { id: childNode.id }
      });

      expect(updatedChildNode?.parentNodeId).toBe(rootNode.id);
      expect(updatedChildNode?.level).toBe(1);
    });

    it('should handle empty subtree gracefully', async () => {
      // Criar árvore
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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
          isLeaf: true
        }
      });

      // Tentar reconectar nó folha
      const result = await reconnectionEngine.reconnectSubtree(
        tree.id,
        rootNode.id
      );

      expect(result.success).toBe(true);
      expect(result.reconnectedNodes).toHaveLength(0);
    });
  });
});
```

## 🔗 Testes de Integração

### 1. MMN APIs

```typescript
// tests/integration/mmn-apis.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { mmnRoutes } from '../../src/routes/mmn';
import { prisma } from '../setup';

describe('MMN APIs', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia().use(mmnRoutes);
  });

  describe('POST /api/mmn/trees', () => {
    it('should create new tree', async () => {
      // Criar CEO
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      const response = await app.handle(
        new Request('http://localhost:3000/api/mmn/trees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Test Tree',
            rootUserId: ceo.id,
            maxDepth: 5
          })
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.treeId).toBeDefined();
    });
  });

  describe('GET /api/mmn/trees', () => {
    it('should list trees', async () => {
      // Criar árvore de teste
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

      const tree = await prisma.mmnTree.create({
        data: {
          name: 'Test Tree',
          rootUserId: ceo.id,
          maxDepth: 5
        }
      });

      const response = await app.handle(
        new Request('http://localhost:3000/api/mmn/trees')
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.trees).toHaveLength(1);
      expect(data.trees[0].id).toBe(tree.id);
    });
  });

  describe('POST /api/mmn/trees/{id}/nodes', () => {
    it('should add node to tree', async () => {
      // Criar árvore
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      const response = await app.handle(
        new Request(`http://localhost:3000/api/mmn/trees/${tree.id}/nodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            parentNodeId: rootNode.id
          })
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.nodeId).toBeDefined();
    });
  });
});
```

### 2. Tree Synchronization

```typescript
// tests/integration/tree-synchronization.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { TreeSynchronizer } from '../../src/integration/tree-synchronizer';
import { prisma } from '../setup';

describe('TreeSynchronizer', () => {
  let synchronizer: TreeSynchronizer;

  beforeEach(() => {
    synchronizer = new TreeSynchronizer();
  });

  describe('synchronizeAffiliateWithTree', () => {
    it('should synchronize affiliate with tree', async () => {
      // Criar usuário e afiliado
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: user.id,
          tenantId: 'main-tenant',
          affiliateCode: 'AFF001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      // Criar árvore
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      const result = await synchronizer.synchronizeAffiliateWithTree(
        affiliate.id,
        tree.id
      );

      expect(result.success).toBe(true);
      expect(result.nodeId).toBeDefined();

      // Verificar se nó foi criado
      const node = await prisma.mmnNode.findUnique({
        where: { id: result.nodeId! }
      });

      expect(node).toBeDefined();
      expect(node?.userId).toBe(user.id);
      expect(node?.parentNodeId).toBe(rootNode.id);
    });
  });

  describe('synchronizeTreeWithAffiliates', () => {
    it('should synchronize tree with all affiliates', async () => {
      // Criar múltiplos afiliados
      const users = await Promise.all([
        prisma.user.create({
          data: {
            email: 'user1@example.com',
            name: 'User 1'
          }
        }),
        prisma.user.create({
          data: {
            email: 'user2@example.com',
            name: 'User 2'
          }
        })
      ]);

      const affiliates = await Promise.all([
        prisma.affiliateUser.create({
          data: {
            userId: users[0].id,
            tenantId: 'main-tenant',
            affiliateCode: 'AFF001',
            userType: 'trader',
            inviteLimit: 5,
            isActive: true
          }
        }),
        prisma.affiliateUser.create({
          data: {
            userId: users[1].id,
            tenantId: 'main-tenant',
            affiliateCode: 'AFF002',
            userType: 'influencer',
            inviteLimit: null,
            isActive: true
          }
        })
      ]);

      // Criar árvore
      const ceo = await prisma.user.create({
        data: {
          email: 'ceo@example.com',
          name: 'CEO User'
        }
      });

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

      const result = await synchronizer.synchronizeTreeWithAffiliates(tree.id);

      expect(result.success).toBe(true);
      expect(result.synchronizedNodes).toHaveLength(2);

      // Verificar se nós foram criados
      const nodes = await prisma.mmnNode.findMany({
        where: {
          treeId: tree.id,
          isActive: true
        }
      });

      expect(nodes).toHaveLength(3); // CEO + 2 afiliados
    });
  });
});
```

## 🎭 Testes E2E

### 1. Tree Creation Flows

```typescript
// tests/e2e/tree-creation-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Tree Creation Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como CEO
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'jcafeitosa@icloud.com');
    await page.fill('[data-testid="password-input"]', 'ca1@2S3d4f5ca');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create main affiliate tree', async ({ page }) => {
    // Navegar para página de MMN
    await page.goto('/mmn/trees');
    
    // Criar nova árvore
    await page.click('[data-testid="create-tree-button"]');
    
    // Preencher dados da árvore
    await page.fill('[data-testid="tree-name-input"]', 'Main Affiliate Tree');
    await page.fill('[data-testid="max-depth-input"]', '5');
    
    // Submeter criação
    await page.click('[data-testid="create-tree-submit"]');
    
    // Verificar se árvore foi criada
    await expect(page.locator('[data-testid="tree-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="tree-list"]')).toContainText('Main Affiliate Tree');
  });

  test('should add nodes to tree', async ({ page }) => {
    // Assumir que árvore já existe
    await page.goto('/mmn/trees');
    
    // Selecionar árvore
    await page.click('[data-testid="tree-item-0"]');
    
    // Adicionar nó
    await page.click('[data-testid="add-node-button"]');
    
    // Preencher dados do nó
    await page.fill('[data-testid="user-email-input"]', 'test@example.com');
    await page.selectOption('[data-testid="user-type-select"]', 'trader');
    
    // Submeter adição
    await page.click('[data-testid="add-node-submit"]');
    
    // Verificar se nó foi adicionado
    await expect(page.locator('[data-testid="node-added-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="tree-visualization"]')).toContainText('test@example.com');
  });
});
```

### 2. Tree Reconnection Flows

```typescript
// tests/e2e/tree-reconnection-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Tree Reconnection Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como CEO
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'jcafeitosa@icloud.com');
    await page.fill('[data-testid="password-input"]', 'ca1@2S3d4f5ca');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should reconnect subtree when invite is revoked', async ({ page }) => {
    // Navegar para árvore
    await page.goto('/mmn/trees');
    await page.click('[data-testid="tree-item-0"]');
    
    // Selecionar nó intermediário
    await page.click('[data-testid="node-intermediate"]');
    
    // Revogar convite
    await page.click('[data-testid="revoke-invite-button"]');
    await page.click('[data-testid="confirm-revoke"]');
    
    // Verificar reconexão
    await expect(page.locator('[data-testid="reconnection-success"]')).toBeVisible();
    
    // Verificar se descendentes foram reconectados à raiz
    await expect(page.locator('[data-testid="tree-visualization"]')).toContainText('Reconnected to root');
  });

  test('should handle multiple reconnections', async ({ page }) => {
    // Navegar para árvore
    await page.goto('/mmn/trees');
    await page.click('[data-testid="tree-item-0"]');
    
    // Revogar múltiplos convites
    const revokeButtons = await page.locator('[data-testid="revoke-invite-button"]').all();
    
    for (let i = 0; i < Math.min(3, revokeButtons.length); i++) {
      await revokeButtons[i].click();
      await page.click('[data-testid="confirm-revoke"]');
      await expect(page.locator('[data-testid="reconnection-success"]')).toBeVisible();
    }
    
    // Verificar estrutura final
    await expect(page.locator('[data-testid="tree-structure"]')).toBeVisible();
  });
});
```

## ⚡ Testes de Performance

### 1. Tree Load Testing

```typescript
// tests/performance/tree-load-testing.test.ts
import { describe, it, expect } from 'bun:test';
import { TreeManager } from '../../src/mmn/tree-manager';
import { prisma } from '../setup';

describe('Tree Load Testing', () => {
  let treeManager: TreeManager;

  beforeEach(() => {
    treeManager = new TreeManager();
  });

  it('should handle large tree creation', async () => {
    // Criar CEO
    const ceo = await prisma.user.create({
      data: {
        email: 'ceo@example.com',
        name: 'CEO User'
      }
    });

    const startTime = Date.now();
    
    // Criar árvore
    const treeResult = await treeManager.createTree('Large Tree', ceo.id, 5);
    expect(treeResult.success).toBe(true);

    const tree = await prisma.mmnTree.findUnique({
      where: { id: treeResult.treeId! }
    });

    const rootNode = await prisma.mmnNode.findFirst({
      where: {
        treeId: tree!.id,
        level: 0
      }
    });

    // Criar 1000 nós
    const users = [];
    for (let i = 0; i < 1000; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user${i}@example.com`,
          name: `User ${i}`
        }
      });
      users.push(user);
    }

    // Adicionar nós em lotes
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(user => 
          treeManager.addNode(tree!.id, user.id, rootNode!.id)
        )
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(30000); // Deve completar em menos de 30 segundos

    // Verificar se todos os nós foram criados
    const nodeCount = await prisma.mmnNode.count({
      where: {
        treeId: tree!.id,
        isActive: true
      }
    });

    expect(nodeCount).toBe(1001); // CEO + 1000 usuários
  });

  it('should handle concurrent node additions', async () => {
    // Criar árvore
    const ceo = await prisma.user.create({
      data: {
        email: 'ceo@example.com',
        name: 'CEO User'
      }
    });

    const treeResult = await treeManager.createTree('Concurrent Tree', ceo.id);
    expect(treeResult.success).toBe(true);

    const tree = await prisma.mmnTree.findUnique({
      where: { id: treeResult.treeId! }
    });

    const rootNode = await prisma.mmnNode.findFirst({
      where: {
        treeId: tree!.id,
        level: 0
      }
    });

    // Criar 100 usuários
    const users = [];
    for (let i = 0; i < 100; i++) {
      const user = await prisma.user.create({
        data: {
          email: `concurrent${i}@example.com`,
          name: `Concurrent User ${i}`
        }
      });
      users.push(user);
    }

    const startTime = Date.now();
    
    // Adicionar nós concorrentemente
    const results = await Promise.all(
      users.map(user => 
        treeManager.addNode(tree!.id, user.id, rootNode!.id)
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Deve completar em menos de 10 segundos

    // Verificar se todos os nós foram criados
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(100);
  });
});
```

### 2. Tree Concurrency Testing

```typescript
// tests/performance/tree-concurrency.test.ts
import { describe, it, expect } from 'bun:test';
import { TreeManager } from '../../src/mmn/tree-manager';
import { ReconnectionEngine } from '../../src/mmn/reconnection-engine';
import { prisma } from '../setup';

describe('Tree Concurrency Testing', () => {
  let treeManager: TreeManager;
  let reconnectionEngine: ReconnectionEngine;

  beforeEach(() => {
    treeManager = new TreeManager();
    reconnectionEngine = new ReconnectionEngine();
  });

  it('should handle concurrent reconnections', async () => {
    // Criar árvore com estrutura complexa
    const ceo = await prisma.user.create({
      data: {
        email: 'ceo@example.com',
        name: 'CEO User'
      }
    });

    const treeResult = await treeManager.createTree('Concurrent Tree', ceo.id);
    expect(treeResult.success).toBe(true);

    const tree = await prisma.mmnTree.findUnique({
      where: { id: treeResult.treeId! }
    });

    const rootNode = await prisma.mmnNode.findFirst({
      where: {
        treeId: tree!.id,
        level: 0
      }
    });

    // Criar estrutura com múltiplos níveis
    const nodes = [];
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < 10; i++) {
        const user = await prisma.user.create({
          data: {
            email: `level${level}user${i}@example.com`,
            name: `Level ${level} User ${i}`
          }
        });

        const parentNode = level === 1 ? rootNode : nodes[Math.floor(Math.random() * nodes.length)];
        
        const addResult = await treeManager.addNode(tree!.id, user.id, parentNode!.id);
        if (addResult.success) {
          const node = await prisma.mmnNode.findUnique({
            where: { id: addResult.nodeId! }
          });
          nodes.push(node!);
        }
      }
    }

    // Executar reconexões concorrentes
    const reconnectionPromises = nodes.slice(0, 5).map(node => 
      reconnectionEngine.reconnectSubtree(tree!.id, node.id)
    );

    const startTime = Date.now();
    const results = await Promise.all(reconnectionPromises);
    const endTime = Date.now();

    const duration = endTime - startTime;
    expect(duration).toBeLessThan(15000); // Deve completar em menos de 15 segundos

    // Verificar se todas as reconexões foram bem-sucedidas
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(5);
  });
});
```

## 📊 Coverage e Relatórios

### 1. Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test:mmn": "bun test tests/unit/mmn/ tests/integration/mmn/",
    "test:mmn:coverage": "bun test --coverage tests/unit/mmn/ tests/integration/mmn/",
    "test:mmn:e2e": "playwright test tests/e2e/tree-*.test.ts",
    "test:mmn:performance": "bun test tests/performance/tree-*.test.ts"
  }
}
```

### 2. Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/mmn/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/mmn-tests.yml
name: MMN System Tests

on:
  push:
    paths: ['src/mmn/**', 'tests/**/mmn*', 'tests/**/tree*']
  pull_request:
    paths: ['src/mmn/**', 'tests/**/mmn*', 'tests/**/tree*']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test tests/unit/mmn/ --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:16.0-pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run integration tests
      run: bun test tests/integration/mmn/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Install Playwright
      run: bunx playwright install --with-deps
    
    - name: Build application
      run: |
        cd backend && bun run build
        cd ../frontend && bun run build
    
    - name: Run E2E tests
      run: bunx playwright test tests/e2e/tree-*.test.ts
      env:
        CI: true
```

## 📋 Checklist de Testes

### ✅ Testes Unitários
- [ ] Tree Manager testado
- [ ] Tree Analyzer testado
- [ ] Tree Rebalancer testado
- [ ] Reconnection Engine testado
- [ ] Tree Traverser testado

### ✅ Testes de Integração
- [ ] MMN APIs testadas
- [ ] Tree Synchronization testada
- [ ] Affiliate-MMN Bridge testada
- [ ] Event Coordination testada

### ✅ Testes E2E
- [ ] Tree Creation Flows testados
- [ ] Tree Reconnection Flows testados
- [ ] Tree Performance Flows testados
- [ ] Responsividade testada

### ✅ Testes de Performance
- [ ] Load testing executado
- [ ] Stress testing executado
- [ ] Concurrency testing executado
- [ ] Memory leaks verificados

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Testes de Reconexão Falhando
```bash
# Verificar logs detalhados
bun test --verbose tests/unit/mmn/reconnection-engine.test.ts

# Verificar estado da árvore
bun test --verbose tests/integration/tree-synchronization.test.ts
```

#### 2. Problemas de Concorrência
```bash
# Executar testes de concorrência isoladamente
bun test tests/performance/tree-concurrency.test.ts

# Verificar locks de banco de dados
bun test --verbose tests/performance/tree-load-testing.test.ts
```

#### 3. Problemas de Performance
```bash
# Executar testes de performance
bun test tests/performance/

# Verificar métricas de memória
bun test --verbose --coverage tests/unit/mmn/
```

## 📞 Suporte

Para problemas de testes MMN:
1. Verificar logs: `bun test --verbose tests/unit/mmn/`
2. Executar testes específicos: `bun test tests/integration/mmn-apis.test.ts`
3. Verificar cobertura: `bun test --coverage tests/unit/mmn/`
4. Contatar equipe de QA

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO