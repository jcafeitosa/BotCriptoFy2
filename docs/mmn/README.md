# Sistema MMN (Multi-Level Marketing) - BotCriptoFy2

## 🌳 Visão Geral

Sistema MMN robusto que gerencia uma árvore hierárquica de afiliados com o CEO como raiz principal. Quando um convite é revogado, toda a árvore abaixo é redirecionada para a árvore principal, mantendo a integridade da estrutura.

## 🏗️ Arquitetura do Sistema MMN

### Componentes Principais
- **Tree Manager**: Gerenciador da árvore MMN
- **Node Manager**: Gerenciador de nós da árvore
- **Tree Rebalancer**: Rebalanceador de árvore após revogação
- **Tree Analyzer**: Analisador de performance da árvore
- **Tree Visualizer**: Visualizador da estrutura da árvore

### Estrutura da Árvore
- **CEO (Raiz)**: Nó principal da árvore
- **Ramos Primários**: Primeiros níveis de afiliados
- **Sub-ramos**: Ramificações secundárias
- **Folhas**: Nós finais da árvore
- **Reconexão**: Redirecionamento automático após revogação

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. mmn_trees
```sql
CREATE TABLE mmn_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  root_user_id UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  max_depth INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. mmn_nodes
```sql
CREATE TABLE mmn_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES mmn_trees(id),
  user_id UUID NOT NULL REFERENCES users(id),
  parent_node_id UUID REFERENCES mmn_nodes(id),
  level INTEGER NOT NULL,
  position INTEGER NOT NULL, -- Posição entre irmãos
  path VARCHAR(500) NOT NULL, -- Caminho completo na árvore
  is_active BOOLEAN DEFAULT true,
  is_leaf BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tree_id, user_id)
);
```

#### 3. mmn_node_relationships
```sql
CREATE TABLE mmn_node_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_node_id UUID NOT NULL REFERENCES mmn_nodes(id),
  child_node_id UUID NOT NULL REFERENCES mmn_nodes(id),
  relationship_type VARCHAR(20) NOT NULL, -- direct, indirect
  level_distance INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_node_id, child_node_id)
);
```

#### 4. mmn_tree_events
```sql
CREATE TABLE mmn_tree_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES mmn_trees(id),
  event_type VARCHAR(50) NOT NULL, -- node_added, node_removed, tree_rebalanced, invite_revoked
  node_id UUID REFERENCES mmn_nodes(id),
  parent_node_id UUID REFERENCES mmn_nodes(id),
  affected_nodes JSONB, -- IDs dos nós afetados
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. mmn_tree_analytics
```sql
CREATE TABLE mmn_tree_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES mmn_trees(id),
  node_id UUID NOT NULL REFERENCES mmn_nodes(id),
  metric_type VARCHAR(50) NOT NULL, -- depth, width, performance, revenue
  metric_value DECIMAL(15,2) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🌳 Funcionalidades do Sistema MMN

### 1. Gestão da Árvore Principal

#### Criação da Árvore
- **CEO como Raiz**: CEO é automaticamente a raiz da árvore
- **Configuração**: Definição de parâmetros da árvore
- **Inicialização**: Criação da estrutura inicial
- **Validação**: Validação da integridade da árvore

#### Estrutura Hierárquica
- **Níveis**: Até 5 níveis de profundidade
- **Ramos**: Múltiplos ramos por nível
- **Posicionamento**: Posição específica entre irmãos
- **Caminho**: Caminho único para cada nó

### 2. Gestão de Nós

#### Adição de Nós
- **Validação**: Verificar se pode adicionar nó
- **Posicionamento**: Definir posição na árvore
- **Caminho**: Gerar caminho único
- **Relacionamentos**: Criar relacionamentos com parent/child

#### Remoção de Nós
- **Revogação**: Revogar convite do nó
- **Reconexão**: Reconectar filhos à árvore principal
- **Reorganização**: Reorganizar estrutura da árvore
- **Auditoria**: Registrar evento de remoção

### 3. Sistema de Reconexão

#### Quando um Convite é Revogado
1. **Identificar Nó**: Localizar nó a ser removido
2. **Identificar Sub-árvore**: Encontrar todos os descendentes
3. **Reconectar à Raiz**: Conectar sub-árvore ao CEO
4. **Reorganizar Níveis**: Ajustar níveis de todos os nós
5. **Atualizar Caminhos**: Atualizar caminhos de todos os nós
6. **Registrar Evento**: Registrar evento de reconexão

#### Algoritmo de Reconexão
- **BFS (Breadth-First Search)**: Percorrer árvore em largura
- **DFS (Depth-First Search)**: Percorrer árvore em profundidade
- **Reorganização**: Reorganizar estrutura mantendo integridade
- **Validação**: Validar nova estrutura da árvore

### 4. Análise da Árvore

#### Métricas da Árvore
- **Profundidade**: Nível máximo da árvore
- **Largura**: Número de nós por nível
- **Densidade**: Densidade de nós por nível
- **Performance**: Performance de cada ramo

#### Análise de Performance
- **Receita por Ramo**: Receita gerada por cada ramo
- **Conversão por Nível**: Taxa de conversão por nível
- **Crescimento**: Taxa de crescimento da árvore
- **Eficiência**: Eficiência de cada nó

## 🔧 Implementação do Sistema

### 1. Tree Manager

```typescript
// backend/src/mmn/tree-manager.ts
import { prisma } from '../db';

export class TreeManager {
  async createTree(
    name: string,
    rootUserId: string,
    maxDepth: number = 5
  ): Promise<{
    success: boolean;
    treeId?: string;
    message: string;
  }> {
    try {
      // Verificar se o CEO existe
      const ceo = await prisma.user.findUnique({
        where: { id: rootUserId }
      });

      if (!ceo) {
        return { success: false, message: 'CEO user not found' };
      }

      // Criar árvore
      const tree = await prisma.mmnTree.create({
        data: {
          name,
          rootUserId,
          maxDepth,
          isActive: true
        }
      });

      // Criar nó raiz (CEO)
      const rootNode = await prisma.mmnNode.create({
        data: {
          treeId: tree.id,
          userId: rootUserId,
          level: 0,
          position: 0,
          path: '0',
          isActive: true,
          isLeaf: false
        }
      });

      // Registrar evento
      await this.logTreeEvent(tree.id, 'tree_created', rootNode.id, null, {
        treeName: name,
        maxDepth
      });

      return {
        success: true,
        treeId: tree.id,
        message: 'Tree created successfully'
      };

    } catch (error) {
      console.error('Error creating tree:', error);
      return { success: false, message: 'Failed to create tree' };
    }
  }

  async addNode(
    treeId: string,
    userId: string,
    parentNodeId: string
  ): Promise<{
    success: boolean;
    nodeId?: string;
    message: string;
  }> {
    try {
      // Verificar se a árvore existe
      const tree = await prisma.mmnTree.findUnique({
        where: { id: treeId }
      });

      if (!tree) {
        return { success: false, message: 'Tree not found' };
      }

      // Verificar se o nó pai existe
      const parentNode = await prisma.mmnNode.findUnique({
        where: { id: parentNodeId }
      });

      if (!parentNode) {
        return { success: false, message: 'Parent node not found' };
      }

      // Verificar se não excede profundidade máxima
      if (parentNode.level >= tree.maxDepth) {
        return { success: false, message: 'Maximum depth reached' };
      }

      // Verificar se o usuário já está na árvore
      const existingNode = await prisma.mmnNode.findFirst({
        where: {
          treeId,
          userId
        }
      });

      if (existingNode) {
        return { success: false, message: 'User already in tree' };
      }

      // Calcular posição entre irmãos
      const siblingCount = await prisma.mmnNode.count({
        where: {
          parentNodeId,
          isActive: true
        }
      });

      const position = siblingCount;

      // Gerar caminho
      const path = `${parentNode.path}.${position}`;

      // Criar nó
      const node = await prisma.mmnNode.create({
        data: {
          treeId,
          userId,
          parentNodeId,
          level: parentNode.level + 1,
          position,
          path,
          isActive: true,
          isLeaf: true
        }
      });

      // Atualizar nó pai para não ser mais folha
      await prisma.mmnNode.update({
        where: { id: parentNodeId },
        data: { isLeaf: false }
      });

      // Criar relacionamento
      await prisma.mmnNodeRelationship.create({
        data: {
          parentNodeId,
          childNodeId: node.id,
          relationshipType: 'direct',
          levelDistance: 1
        }
      });

      // Registrar evento
      await this.logTreeEvent(treeId, 'node_added', node.id, parentNodeId, {
        userId,
        level: node.level,
        position
      });

      return {
        success: true,
        nodeId: node.id,
        message: 'Node added successfully'
      };

    } catch (error) {
      console.error('Error adding node:', error);
      return { success: false, message: 'Failed to add node' };
    }
  }

  async removeNode(
    treeId: string,
    nodeId: string
  ): Promise<{
    success: boolean;
    affectedNodes?: string[];
    message: string;
  }> {
    try {
      // Buscar nó a ser removido
      const nodeToRemove = await prisma.mmnNode.findUnique({
        where: { id: nodeId },
        include: {
          children: true
        }
      });

      if (!nodeToRemove) {
        return { success: false, message: 'Node not found' };
      }

      // Buscar árvore
      const tree = await prisma.mmnTree.findUnique({
        where: { id: treeId }
      });

      if (!tree) {
        return { success: false, message: 'Tree not found' };
      }

      // Buscar nó raiz (CEO)
      const rootNode = await prisma.mmnNode.findFirst({
        where: {
          treeId,
          level: 0
        }
      });

      if (!rootNode) {
        return { success: false, message: 'Root node not found' };
      }

      // Identificar todos os descendentes
      const descendants = await this.getAllDescendants(nodeId);
      const affectedNodes = [nodeId, ...descendants.map(d => d.id)];

      // Reconectar descendentes à raiz
      for (const descendant of descendants) {
        await this.reconnectToRoot(descendant, rootNode);
      }

      // Remover nó
      await prisma.mmnNode.update({
        where: { id: nodeId },
        data: { isActive: false }
      });

      // Atualizar relacionamentos
      await prisma.mmnNodeRelationship.updateMany({
        where: {
          OR: [
            { parentNodeId: nodeId },
            { childNodeId: nodeId }
          ]
        },
        data: { isActive: false }
      });

      // Verificar se nó pai se tornou folha
      if (nodeToRemove.parentNodeId) {
        const parentChildren = await prisma.mmnNode.count({
          where: {
            parentNodeId: nodeToRemove.parentNodeId,
            isActive: true
          }
        });

        if (parentChildren === 0) {
          await prisma.mmnNode.update({
            where: { id: nodeToRemove.parentNodeId },
            data: { isLeaf: true }
          });
        }
      }

      // Registrar evento
      await this.logTreeEvent(treeId, 'node_removed', nodeId, nodeToRemove.parentNodeId, {
        affectedNodes,
        reason: 'invite_revoked'
      });

      return {
        success: true,
        affectedNodes,
        message: 'Node removed and descendants reconnected to root'
      };

    } catch (error) {
      console.error('Error removing node:', error);
      return { success: false, message: 'Failed to remove node' };
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
        }
      });

      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  private async reconnectToRoot(descendant: any, rootNode: any) {
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
      where: { id: descendant.id },
      data: {
        parentNodeId: rootNode.id,
        level: newLevel,
        position: newPosition,
        path: newPath
      }
    });

    // Criar novo relacionamento
    await prisma.mmnNodeRelationship.create({
      data: {
        parentNodeId: rootNode.id,
        childNodeId: descendant.id,
        relationshipType: 'direct',
        levelDistance: 1
      }
    });

    // Atualizar nó raiz para não ser folha
    await prisma.mmnNode.update({
      where: { id: rootNode.id },
      data: { isLeaf: false }
    });
  }

  private async logTreeEvent(
    treeId: string,
    eventType: string,
    nodeId: string | null,
    parentNodeId: string | null,
    eventData: any
  ) {
    await prisma.mmnTreeEvent.create({
      data: {
        treeId,
        eventType,
        nodeId,
        parentNodeId,
        eventData
      }
    });
  }
}
```

### 2. Tree Analyzer

```typescript
// backend/src/mmn/tree-analyzer.ts
export class TreeAnalyzer {
  async analyzeTree(treeId: string): Promise<{
    totalNodes: number;
    maxDepth: number;
    nodesByLevel: Record<number, number>;
    performance: {
      totalRevenue: number;
      averageRevenuePerNode: number;
      topPerformers: any[];
    };
    structure: {
      isBalanced: boolean;
      density: number;
      growthRate: number;
    };
  }> {
    // Buscar todos os nós da árvore
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
      }
    });

    // Calcular métricas básicas
    const totalNodes = nodes.length;
    const maxDepth = Math.max(...nodes.map(n => n.level));
    
    // Agrupar por nível
    const nodesByLevel = nodes.reduce((acc, node) => {
      acc[node.level] = (acc[node.level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Calcular performance
    const performance = await this.calculatePerformance(treeId, nodes);

    // Calcular estrutura
    const structure = this.calculateStructure(nodes, maxDepth);

    return {
      totalNodes,
      maxDepth,
      nodesByLevel,
      performance,
      structure
    };
  }

  private async calculatePerformance(treeId: string, nodes: any[]) {
    // Buscar receita total da árvore
    const totalRevenue = await prisma.affiliateCommission.aggregate({
      where: {
        affiliateUser: {
          user: {
            id: {
              in: nodes.map(n => n.userId)
            }
          }
        }
      },
      _sum: {
        commissionAmount: true
      }
    });

    const revenue = totalRevenue._sum.commissionAmount || 0;
    const averageRevenuePerNode = revenue / nodes.length;

    // Buscar top performers
    const topPerformers = await prisma.affiliateCommission.groupBy({
      by: ['affiliateUserId'],
      where: {
        affiliateUser: {
          user: {
            id: {
              in: nodes.map(n => n.userId)
            }
          }
        }
      },
      _sum: {
        commissionAmount: true
      },
      orderBy: {
        _sum: {
          commissionAmount: 'desc'
        }
      },
      take: 10
    });

    return {
      totalRevenue: revenue,
      averageRevenuePerNode,
      topPerformers
    };
  }

  private calculateStructure(nodes: any[], maxDepth: number) {
    // Calcular se a árvore está balanceada
    const levelCounts = Object.values(nodes.reduce((acc, node) => {
      acc[node.level] = (acc[node.level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>));

    const isBalanced = levelCounts.every(count => 
      count <= Math.max(...levelCounts) * 0.8
    );

    // Calcular densidade
    const totalPossibleNodes = Math.pow(2, maxDepth + 1) - 1;
    const density = nodes.length / totalPossibleNodes;

    // Calcular taxa de crescimento (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentNodes = nodes.filter(node => 
      node.createdAt > thirtyDaysAgo
    );

    const growthRate = recentNodes.length / 30; // por dia

    return {
      isBalanced,
      density,
      growthRate
    };
  }

  async getTreeVisualization(treeId: string): Promise<{
    nodes: any[];
    edges: any[];
    layout: any;
  }> {
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

    // Gerar layout hierárquico
    const layout = this.generateHierarchicalLayout(nodes);

    return {
      nodes: nodes.map(node => ({
        id: node.id,
        userId: node.userId,
        userName: node.user.name,
        userEmail: node.user.email,
        level: node.level,
        position: node.position,
        path: node.path,
        isLeaf: node.isLeaf
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.parentNodeId,
        target: edge.childNodeId,
        type: edge.relationshipType
      })),
      layout
    };
  }

  private generateHierarchicalLayout(nodes: any[]) {
    const layout = {};
    const levelWidths = {};

    // Calcular largura de cada nível
    nodes.forEach(node => {
      levelWidths[node.level] = (levelWidths[node.level] || 0) + 1;
    });

    // Posicionar nós
    nodes.forEach(node => {
      const x = (node.position / levelWidths[node.level]) * 100;
      const y = node.level * 100;

      layout[node.id] = {
        x,
        y,
        width: 100 / levelWidths[node.level],
        height: 80
      };
    });

    return layout;
  }
}
```

### 3. Tree Rebalancer

```typescript
// backend/src/mmn/tree-rebalancer.ts
export class TreeRebalancer {
  async rebalanceTree(treeId: string): Promise<{
    success: boolean;
    rebalancedNodes: string[];
    message: string;
  }> {
    try {
      // Buscar árvore
      const tree = await prisma.mmnTree.findUnique({
        where: { id: treeId }
      });

      if (!tree) {
        return { success: false, rebalancedNodes: [], message: 'Tree not found' };
      }

      // Buscar todos os nós
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

      // Reorganizar posições
      const rebalancedNodes = [];
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
            
            rebalancedNodes.push(node.id);
          }
        }
      }

      // Registrar evento
      await prisma.mmnTreeEvent.create({
        data: {
          treeId,
          eventType: 'tree_rebalanced',
          eventData: {
            rebalancedNodes,
            timestamp: new Date()
          }
        }
      });

      return {
        success: true,
        rebalancedNodes,
        message: 'Tree rebalanced successfully'
      };

    } catch (error) {
      console.error('Error rebalancing tree:', error);
      return { success: false, rebalancedNodes: [], message: 'Failed to rebalance tree' };
    }
  }

  async optimizeTree(treeId: string): Promise<{
    success: boolean;
    optimizations: string[];
    message: string;
  }> {
    try {
      const optimizations = [];

      // Buscar árvore
      const tree = await prisma.mmnTree.findUnique({
        where: { id: treeId }
      });

      if (!tree) {
        return { success: false, optimizations: [], message: 'Tree not found' };
      }

      // Otimização 1: Mover nós órfãos para a raiz
      const orphanNodes = await prisma.mmnNode.findMany({
        where: {
          treeId,
          isActive: true,
          parentNodeId: null,
          level: { gt: 0 }
        }
      });

      if (orphanNodes.length > 0) {
        const rootNode = await prisma.mmnNode.findFirst({
          where: {
            treeId,
            level: 0
          }
        });

        if (rootNode) {
          for (const orphan of orphanNodes) {
            await this.reconnectToRoot(orphan, rootNode);
          }
          optimizations.push(`Moved ${orphanNodes.length} orphan nodes to root`);
        }
      }

      // Otimização 2: Reorganizar níveis desbalanceados
      const levelCounts = await prisma.mmnNode.groupBy({
        by: ['level'],
        where: {
          treeId,
          isActive: true
        },
        _count: {
          id: true
        }
      });

      const maxCount = Math.max(...levelCounts.map(l => l._count.id));
      const unbalancedLevels = levelCounts.filter(l => l._count.id < maxCount * 0.5);

      if (unbalancedLevels.length > 0) {
        optimizations.push(`Found ${unbalancedLevels.length} unbalanced levels`);
      }

      // Otimização 3: Consolidar nós vazios
      const emptyNodes = await prisma.mmnNode.findMany({
        where: {
          treeId,
          isActive: true,
          isLeaf: true,
          user: {
            affiliateUser: {
              totalEarnings: 0
            }
          }
        }
      });

      if (emptyNodes.length > 0) {
        optimizations.push(`Found ${emptyNodes.length} empty nodes`);
      }

      return {
        success: true,
        optimizations,
        message: 'Tree optimization completed'
      };

    } catch (error) {
      console.error('Error optimizing tree:', error);
      return { success: false, optimizations: [], message: 'Failed to optimize tree' };
    }
  }

  private async reconnectToRoot(node: any, rootNode: any) {
    // Implementar reconexão à raiz
    const rootChildrenCount = await prisma.mmnNode.count({
      where: {
        parentNodeId: rootNode.id,
        isActive: true
      }
    });

    await prisma.mmnNode.update({
      where: { id: node.id },
      data: {
        parentNodeId: rootNode.id,
        level: 1,
        position: rootChildrenCount,
        path: `${rootNode.path}.${rootChildrenCount}`
      }
    });
  }
}
```

## 🔧 APIs do Sistema MMN

### 1. Tree Management APIs

#### POST /api/mmn/trees
Criar nova árvore MMN

```typescript
interface CreateTreeRequest {
  name: string;
  rootUserId: string;
  maxDepth?: number;
}

interface CreateTreeResponse {
  success: boolean;
  treeId?: string;
  message: string;
}
```

#### GET /api/mmn/trees
Listar árvores MMN

```typescript
interface TreeListResponse {
  trees: {
    id: string;
    name: string;
    rootUserId: string;
    maxDepth: number;
    isActive: boolean;
    createdAt: string;
  }[];
}
```

#### GET /api/mmn/trees/{id}
Obter detalhes da árvore

```typescript
interface TreeDetailsResponse {
  id: string;
  name: string;
  rootUserId: string;
  maxDepth: number;
  isActive: boolean;
  totalNodes: number;
  maxDepth: number;
  nodesByLevel: Record<number, number>;
  performance: {
    totalRevenue: number;
    averageRevenuePerNode: number;
    topPerformers: any[];
  };
  structure: {
    isBalanced: boolean;
    density: number;
    growthRate: number;
  };
}
```

### 2. Node Management APIs

#### POST /api/mmn/trees/{id}/nodes
Adicionar nó à árvore

```typescript
interface AddNodeRequest {
  userId: string;
  parentNodeId: string;
}

interface AddNodeResponse {
  success: boolean;
  nodeId?: string;
  message: string;
}
```

#### DELETE /api/mmn/trees/{id}/nodes/{nodeId}
Remover nó da árvore

```typescript
interface RemoveNodeResponse {
  success: boolean;
  affectedNodes?: string[];
  message: string;
}
```

#### GET /api/mmn/trees/{id}/nodes
Listar nós da árvore

```typescript
interface NodeListResponse {
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
}
```

### 3. Tree Visualization APIs

#### GET /api/mmn/trees/{id}/visualization
Obter visualização da árvore

```typescript
interface TreeVisualizationResponse {
  nodes: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    level: number;
    position: number;
    path: string;
    isLeaf: boolean;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
  }[];
  layout: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}
```

#### GET /api/mmn/trees/{id}/analytics
Obter analytics da árvore

```typescript
interface TreeAnalyticsResponse {
  totalNodes: number;
  maxDepth: number;
  nodesByLevel: Record<number, number>;
  performance: {
    totalRevenue: number;
    averageRevenuePerNode: number;
    topPerformers: any[];
  };
  structure: {
    isBalanced: boolean;
    density: number;
    growthRate: number;
  };
}
```

## 🧪 Testes do Sistema MMN

### Testes Unitários

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

      // Verificar se o nó raiz foi criado
      const rootNode = await prisma.mmnNode.findFirst({
        where: {
          treeId: result.treeId!,
          level: 0
        }
      });

      expect(rootNode).toBeDefined();
      expect(rootNode?.userId).toBe(ceo.id);
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
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas do sistema MMN
- [ ] Configurar CEO como raiz
- [ ] Implementar validações
- [ ] Configurar eventos de árvore

### ✅ Funcionalidades
- [ ] Criação de árvore
- [ ] Adição de nós
- [ ] Remoção de nós
- [ ] Reconexão automática

### ✅ Analytics
- [ ] Análise de árvore
- [ ] Visualização hierárquica
- [ ] Métricas de performance
- [ ] Otimização automática

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de reconexão
- [ ] Testes de performance

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO