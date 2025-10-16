# Sistema de Reconexão Automática - BotCriptoFy2

## 🔄 Visão Geral

Sistema de reconexão automática que garante a integridade da árvore MMN quando um convite é revogado. Todos os descendentes do nó removido são automaticamente reconectados à árvore principal (CEO), mantendo a estrutura hierárquica.

## 🏗️ Arquitetura da Reconexão

### Componentes Principais
- **Reconnection Engine**: Motor de reconexão automática
- **Tree Traverser**: Percursor da árvore para identificar descendentes
- **Path Calculator**: Calculador de novos caminhos na árvore
- **Relationship Manager**: Gerenciador de relacionamentos entre nós
- **Event Logger**: Logger de eventos de reconexão

### Fluxo de Reconexão
1. **Identificação**: Localizar nó a ser removido
2. **Mapeamento**: Identificar todos os descendentes
3. **Reconexão**: Conectar descendentes à raiz (CEO)
4. **Reorganização**: Ajustar níveis e posições
5. **Validação**: Validar nova estrutura da árvore
6. **Auditoria**: Registrar evento de reconexão

## 🔧 Implementação da Reconexão

### 1. Reconnection Engine

```typescript
// backend/src/mmn/reconnection-engine.ts
import { prisma } from '../db';

export class ReconnectionEngine {
  async reconnectSubtree(
    treeId: string,
    nodeToRemoveId: string
  ): Promise<{
    success: boolean;
    reconnectedNodes: string[];
    newStructure: any;
    message: string;
  }> {
    try {
      // 1. Identificar nó a ser removido
      const nodeToRemove = await prisma.mmnNode.findUnique({
        where: { id: nodeToRemoveId },
        include: {
          children: true
        }
      });

      if (!nodeToRemove) {
        return {
          success: false,
          reconnectedNodes: [],
          newStructure: null,
          message: 'Node to remove not found'
        };
      }

      // 2. Buscar nó raiz (CEO)
      const rootNode = await prisma.mmnNode.findFirst({
        where: {
          treeId,
          level: 0
        }
      });

      if (!rootNode) {
        return {
          success: false,
          reconnectedNodes: [],
          newStructure: null,
          message: 'Root node not found'
        };
      }

      // 3. Identificar todos os descendentes
      const descendants = await this.getAllDescendants(nodeToRemoveId);
      const reconnectedNodes: string[] = [];

      // 4. Reconectar cada descendente à raiz
      for (const descendant of descendants) {
        const reconnectionResult = await this.reconnectNodeToRoot(
          descendant,
          rootNode,
          treeId
        );

        if (reconnectionResult.success) {
          reconnectedNodes.push(descendant.id);
        }
      }

      // 5. Remover nó original
      await this.removeOriginalNode(nodeToRemoveId);

      // 6. Reorganizar árvore
      await this.reorganizeTree(treeId);

      // 7. Gerar nova estrutura
      const newStructure = await this.generateTreeStructure(treeId);

      // 8. Registrar evento
      await this.logReconnectionEvent(
        treeId,
        nodeToRemoveId,
        reconnectedNodes,
        rootNode.id
      );

      return {
        success: true,
        reconnectedNodes,
        newStructure,
        message: `Successfully reconnected ${reconnectedNodes.length} nodes to root`
      };

    } catch (error) {
      console.error('Error reconnecting subtree:', error);
      return {
        success: false,
        reconnectedNodes: [],
        newStructure: null,
        message: 'Failed to reconnect subtree'
      };
    }
  }

  private async getAllDescendants(nodeId: string): Promise<any[]> {
    const descendants = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      const children = await prisma.mmnNode.findMany({
        where: {
          parentNodeId: currentId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  private async reconnectNodeToRoot(
    node: any,
    rootNode: any,
    treeId: string
  ): Promise<{
    success: boolean;
    newPath?: string;
    newLevel?: number;
    newPosition?: number;
  }> {
    try {
      // Calcular nova posição na raiz
      const rootChildrenCount = await prisma.mmnNode.count({
        where: {
          parentNodeId: rootNode.id,
          isActive: true
        }
      });

      const newPosition = rootChildrenCount;
      const newPath = `${rootNode.path}.${newPosition}`;
      const newLevel = 1;

      // Atualizar nó
      await prisma.mmnNode.update({
        where: { id: node.id },
        data: {
          parentNodeId: rootNode.id,
          level: newLevel,
          position: newPosition,
          path: newPath
        }
      });

      // Criar novo relacionamento direto
      await prisma.mmnNodeRelationship.create({
        data: {
          parentNodeId: rootNode.id,
          childNodeId: node.id,
          relationshipType: 'direct',
          levelDistance: 1
        }
      });

      // Atualizar nó raiz para não ser folha
      await prisma.mmnNode.update({
        where: { id: rootNode.id },
        data: { isLeaf: false }
      });

      return {
        success: true,
        newPath,
        newLevel,
        newPosition
      };

    } catch (error) {
      console.error('Error reconnecting node to root:', error);
      return { success: false };
    }
  }

  private async removeOriginalNode(nodeId: string) {
    // Desativar nó
    await prisma.mmnNode.update({
      where: { id: nodeId },
      data: { isActive: false }
    });

    // Desativar relacionamentos
    await prisma.mmnNodeRelationship.updateMany({
      where: {
        OR: [
          { parentNodeId: nodeId },
          { childNodeId: nodeId }
        ]
      },
      data: { isActive: false }
    });
  }

  private async reorganizeTree(treeId: string) {
    // Buscar todos os nós ativos
    const nodes = await prisma.mmnNode.findMany({
      where: {
        treeId,
        isActive: true
      },
      orderBy: [
        { level: 'asc' },
        { position: 'asc' }
      ]
    });

    // Reorganizar posições por nível
    const levelGroups = nodes.reduce((acc, node) => {
      if (!acc[node.level]) acc[node.level] = [];
      acc[node.level].push(node);
      return acc;
    }, {} as Record<number, any[]>);

    for (const level in levelGroups) {
      const levelNodes = levelGroups[level];
      
      for (let i = 0; i < levelNodes.length; i++) {
        const node = levelNodes[i];
        
        if (node.position !== i) {
          await prisma.mmnNode.update({
            where: { id: node.id },
            data: { position: i }
          });
        }
      }
    }
  }

  private async generateTreeStructure(treeId: string) {
    const nodes = await prisma.mmnNode.findMany({
      where: {
        treeId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { position: 'asc' }
      ]
    });

    const edges = await prisma.mmnNodeRelationship.findMany({
      where: {
        parentNodeId: {
          in: nodes.map(n => n.id)
        },
        isActive: true
      }
    });

    return {
      nodes: nodes.map(node => ({
        id: node.id,
        userId: node.userId,
        userName: node.user.name,
        userEmail: node.user.email,
        level: node.level,
        position: node.position,
        path: node.path,
        isLeaf: node.isLeaf,
        parentNodeId: node.parentNodeId
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.parentNodeId,
        target: edge.childNodeId,
        type: edge.relationshipType,
        levelDistance: edge.levelDistance
      }))
    };
  }

  private async logReconnectionEvent(
    treeId: string,
    removedNodeId: string,
    reconnectedNodes: string[],
    rootNodeId: string
  ) {
    await prisma.mmnTreeEvent.create({
      data: {
        treeId,
        eventType: 'subtree_reconnected',
        nodeId: removedNodeId,
        parentNodeId: rootNodeId,
        affectedNodes: reconnectedNodes,
        eventData: {
          removedNodeId,
          reconnectedNodes,
          rootNodeId,
          timestamp: new Date(),
          reason: 'invite_revoked'
        }
      }
    });
  }
}
```

### 2. Tree Traverser

```typescript
// backend/src/mmn/tree-traverser.ts
export class TreeTraverser {
  async traverseTree(
    treeId: string,
    startNodeId?: string
  ): Promise<{
    nodes: any[];
    edges: any[];
    levels: Record<number, any[]>;
    maxDepth: number;
  }> {
    const startNode = startNodeId 
      ? await prisma.mmnNode.findUnique({ where: { id: startNodeId } })
      : await prisma.mmnNode.findFirst({
          where: { treeId, level: 0, isActive: true }
        });

    if (!startNode) {
      throw new Error('Start node not found');
    }

    const visited = new Set<string>();
    const nodes: any[] = [];
    const edges: any[] = [];
    const levels: Record<number, any[]> = {};

    await this.dfsTraversal(startNode, visited, nodes, edges, levels);

    const maxDepth = Math.max(...Object.keys(levels).map(Number));

    return {
      nodes,
      edges,
      levels,
      maxDepth
    };
  }

  private async dfsTraversal(
    node: any,
    visited: Set<string>,
    nodes: any[],
    edges: any[],
    levels: Record<number, any[]>
  ) {
    if (visited.has(node.id)) {
      return;
    }

    visited.add(node.id);
    nodes.push(node);

    // Adicionar ao nível
    if (!levels[node.level]) {
      levels[node.level] = [];
    }
    levels[node.level].push(node);

    // Buscar filhos
    const children = await prisma.mmnNode.findMany({
      where: {
        parentNodeId: node.id,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    for (const child of children) {
      // Adicionar aresta
      edges.push({
        source: node.id,
        target: child.id,
        level: child.level - node.level
      });

      // Recursão
      await this.dfsTraversal(child, visited, nodes, edges, levels);
    }
  }

  async findDescendants(nodeId: string): Promise<any[]> {
    const descendants = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      const children = await prisma.mmnNode.findMany({
        where: {
          parentNodeId: currentId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  async findAncestors(nodeId: string): Promise<any[]> {
    const ancestors = [];
    let currentNodeId = nodeId;

    while (currentNodeId) {
      const node = await prisma.mmnNode.findUnique({
        where: { id: currentNodeId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!node) break;

      ancestors.unshift(node);
      currentNodeId = node.parentNodeId || '';
    }

    return ancestors;
  }

  async findSiblings(nodeId: string): Promise<any[]> {
    const node = await prisma.mmnNode.findUnique({
      where: { id: nodeId }
    });

    if (!node || !node.parentNodeId) {
      return [];
    }

    return await prisma.mmnNode.findMany({
      where: {
        parentNodeId: node.parentNodeId,
        isActive: true,
        id: { not: nodeId }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }
}
```

### 3. Path Calculator

```typescript
// backend/src/mmn/path-calculator.ts
export class PathCalculator {
  calculateNewPath(
    rootPath: string,
    position: number
  ): string {
    return `${rootPath}.${position}`;
  }

  async calculateOptimalPath(
    treeId: string,
    parentNodeId: string
  ): Promise<{
    path: string;
    level: number;
    position: number;
  }> {
    const parentNode = await prisma.mmnNode.findUnique({
      where: { id: parentNodeId }
    });

    if (!parentNode) {
      throw new Error('Parent node not found');
    }

    // Calcular posição entre irmãos
    const siblingCount = await prisma.mmnNode.count({
      where: {
        parentNodeId,
        isActive: true
      }
    });

    const position = siblingCount;
    const level = parentNode.level + 1;
    const path = this.calculateNewPath(parentNode.path, position);

    return {
      path,
      level,
      position
    };
  }

  async validatePath(path: string, treeId: string): Promise<boolean> {
    // Verificar se o caminho é único na árvore
    const existingNode = await prisma.mmnNode.findFirst({
      where: {
        treeId,
        path,
        isActive: true
      }
    });

    return !existingNode;
  }

  async getPathDepth(path: string): Promise<number> {
    return path.split('.').length - 1;
  }

  async getPathAncestors(path: string): Promise<string[]> {
    const parts = path.split('.');
    const ancestors = [];

    for (let i = 1; i < parts.length; i++) {
      ancestors.push(parts.slice(0, i).join('.'));
    }

    return ancestors;
  }

  async getPathDescendants(
    path: string,
    treeId: string
  ): Promise<any[]> {
    return await prisma.mmnNode.findMany({
      where: {
        treeId,
        path: {
          startsWith: `${path}.`
        },
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }
}
```

## 📊 APIs de Reconexão

### 1. Reconnection APIs

#### POST /api/mmn/trees/{id}/reconnect
Reconectar sub-árvore

```typescript
interface ReconnectRequest {
  nodeId: string;
  reason?: string;
}

interface ReconnectResponse {
  success: boolean;
  reconnectedNodes: string[];
  newStructure: {
    nodes: any[];
    edges: any[];
  };
  message: string;
}
```

#### GET /api/mmn/trees/{id}/descendants/{nodeId}
Obter descendentes de um nó

```typescript
interface DescendantsResponse {
  descendants: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    level: number;
    position: number;
    path: string;
  }[];
  totalCount: number;
  maxDepth: number;
}
```

#### GET /api/mmn/trees/{id}/ancestors/{nodeId}
Obter ancestrais de um nó

```typescript
interface AncestorsResponse {
  ancestors: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    level: number;
    position: number;
    path: string;
  }[];
  totalCount: number;
}
```

### 2. Tree Structure APIs

#### GET /api/mmn/trees/{id}/structure
Obter estrutura completa da árvore

```typescript
interface TreeStructureResponse {
  nodes: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    level: number;
    position: number;
    path: string;
    isLeaf: boolean;
    parentNodeId?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    levelDistance: number;
  }[];
  levels: Record<number, any[]>;
  maxDepth: number;
  totalNodes: number;
}
```

#### GET /api/mmn/trees/{id}/events
Obter eventos da árvore

```typescript
interface TreeEventsResponse {
  events: {
    id: string;
    eventType: string;
    nodeId?: string;
    parentNodeId?: string;
    affectedNodes?: string[];
    eventData: any;
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

## 🧪 Testes de Reconexão

### Testes Unitários

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

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas de reconexão
- [ ] Implementar motor de reconexão
- [ ] Configurar validações
- [ ] Configurar logging de eventos

### ✅ Funcionalidades
- [ ] Reconexão automática
- [ ] Cálculo de caminhos
- [ ] Reorganização de árvore
- [ ] Validação de estrutura

### ✅ APIs
- [ ] APIs de reconexão
- [ ] APIs de estrutura
- [ ] APIs de eventos
- [ ] APIs de validação

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de reconexão
- [ ] Testes de validação

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO