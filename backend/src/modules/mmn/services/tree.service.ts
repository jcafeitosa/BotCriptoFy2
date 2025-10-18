/**
 * MMN Tree Service
 * Manages binary tree structure, placement, and spillover
 */

import { db } from '@/db';
import { eq, and,  isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError, ConflictError, BadRequestError } from '@/utils/errors';
import {
  mmnTree,
  mmnPositions,
  type MmnTree,
  type NewMmnTree,
} from '../schema/mmn.schema';
import { GenealogyService } from './genealogy.service';
import {
  calculatePath,
  getLevelFromPath,
  // findNextPosition,
  // findWeakerLeg,
} from '../utils/binary-tree';
import type {
  TreePosition,
  TreeNode,
  SpilloverResult,
  JoinMmnData,
} from '../types/mmn.types';

export class TreeService {
  /**
   * Create root node (first member in tenant)
   */
  static async createRoot(
    userId: string,
    tenantId: string
  ): Promise<MmnTree> {
    logger.info('Creating MMN root node', { userId, tenantId });

    // Check if root already exists
    const existing = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          isNull(mmnTree.parentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('MMN root already exists for this tenant');
    }

    // Create root node
    const newNode: NewMmnTree = {
      userId,
      tenantId,
      sponsorId: userId, // Root sponsors themselves
      parentId: null,
      position: 'left', // Arbitrary for root
      level: 1,
      path: '1',
      status: 'active',
      isQualified: true,
      activatedAt: new Date(),
    };

    const nodes = await db.insert(mmnTree).values(newNode).returning() as MmnTree[];
    const node = nodes[0]!;

    logger.info('MMN root node created', { nodeId: node.id });

    return node;
  }

  /**
   * Create new node with automatic spillover placement
   */
  static async createNode(data: JoinMmnData): Promise<{
    node: MmnTree;
    placement: SpilloverResult;
  }> {
    logger.info('Creating MMN node', {
      userId: data.userId,
      sponsorId: data.sponsorId,
      tenantId: data.tenantId,
    });

    // Validate user doesn't already exist in tree
    const existingUser = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, data.userId),
          eq(mmnTree.tenantId, data.tenantId)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictError('User already exists in MMN tree');
    }

    // Get sponsor node
    const [sponsor] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, data.sponsorId),
          eq(mmnTree.tenantId, data.tenantId)
        )
      )
      .limit(1);

    if (!sponsor) {
      throw new NotFoundError('Sponsor not found in MMN tree');
    }

    // Find placement using spillover
    const placement = await this.findPlacement(
      sponsor.id,
      data.tenantId,
      data.preferredPosition
    );

    // Create node
    const newNode: NewMmnTree = {
      userId: data.userId,
      tenantId: data.tenantId,
      sponsorId: data.sponsorId,
      parentId: placement.parentId,
      position: placement.position,
      level: placement.level,
      path: placement.path,
      status: 'active',
      isQualified: false, // Must qualify through sales
    };

    const nodes = await db.insert(mmnTree).values(newNode).returning() as MmnTree[];
    const node = nodes[0]!;

    // Update parent's child reference
    await this.updateParentChild(placement.parentId, placement.position, node.id);

    // Record genealogy
    await GenealogyService.recordGenealogyChain(node.id, placement.parentId, data.tenantId);

    // Mark position as occupied
    await this.markPositionOccupied(placement.parentId, placement.position, node.id);

    logger.info('MMN node created', {
      nodeId: node.id,
      parentId: placement.parentId,
      position: placement.position,
      level: placement.level,
    });

    return { node, placement };
  }

  /**
   * Find placement for new member using spillover algorithm
   */
  private static async findPlacement(
    sponsorId: string,
    tenantId: string,
    preferredPosition?: TreePosition
  ): Promise<SpilloverResult> {
    // Get sponsor's current tree state
    const [sponsor] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, sponsorId))
      .limit(1);

    if (!sponsor) {
      throw new NotFoundError('Sponsor node not found');
    }

    // Check direct placement under sponsor
    if (!sponsor.leftChildId && (!preferredPosition || preferredPosition === 'left')) {
      return {
        parentId: sponsor.id,
        position: 'left',
        level: sponsor.level + 1,
        path: calculatePath(sponsor.path, 'left'),
      };
    }

    if (!sponsor.rightChildId && (!preferredPosition || preferredPosition === 'right')) {
      return {
        parentId: sponsor.id,
        position: 'right',
        level: sponsor.level + 1,
        path: calculatePath(sponsor.path, 'right'),
      };
    }

    // Both positions occupied, find in downline using BFS
    return await this.findInDownline(sponsor.id, tenantId, preferredPosition);
  }

  /**
   * Find available position in downline using breadth-first search
   */
  private static async findInDownline(
    rootId: string,
    tenantId: string,
    preferredPosition?: TreePosition
  ): Promise<SpilloverResult> {
    const queue: string[] = [rootId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const [node] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, nodeId))
        .limit(1);

      if (!node) continue;

      // Check for available positions
      if (!node.leftChildId && (!preferredPosition || preferredPosition === 'left')) {
        return {
          parentId: node.id,
          position: 'left',
          level: node.level + 1,
          path: calculatePath(node.path, 'left'),
        };
      }

      if (!node.rightChildId && (!preferredPosition || preferredPosition === 'right')) {
        return {
          parentId: node.id,
          position: 'right',
          level: node.level + 1,
          path: calculatePath(node.path, 'right'),
        };
      }

      // Add children to queue
      if (node.leftChildId) queue.push(node.leftChildId);
      if (node.rightChildId) queue.push(node.rightChildId);
    }

    throw new BadRequestError('No available positions found in tree');
  }

  /**
   * Update parent's child reference
   */
  private static async updateParentChild(
    parentId: string,
    position: TreePosition,
    childId: string
  ): Promise<void> {
    const updateField = position === 'left' ? { leftChildId: childId } : { rightChildId: childId };

    await db
      .update(mmnTree)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(mmnTree.id, parentId));
  }

  /**
   * Mark position as occupied
   */
  private static async markPositionOccupied(
    parentId: string,
    position: TreePosition,
    occupiedBy: string
  ): Promise<void> {
    await db
      .update(mmnPositions)
      .set({
        isOccupied: true,
        occupiedBy,
        occupiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mmnPositions.parentId, parentId),
          eq(mmnPositions.position, position)
        )
      );
  }

  /**
   * Get tree structure with specified depth
   */
  static async getTree(
    userId: string,
    tenantId: string,
    depth: number = 3
  ): Promise<TreeNode | null> {
    const [rootNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!rootNode) {
      return null;
    }

    return await this.buildTreeNode(rootNode, depth, 0);
  }

  /**
   * Build tree node recursively
   */
  private static async buildTreeNode(
    node: MmnTree,
    maxDepth: number,
    currentDepth: number
  ): Promise<TreeNode> {
    // Get tenant ID from the node's database record
    const [nodeWithTenant] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, node.id))
      .limit(1);

    // Get current rank from ranks table
    let rankName = 'Distributor';
    try {
      const { RankService } = await import('./rank.service');
      const currentRank = await RankService.getCurrentRank(node.userId, nodeWithTenant?.tenantId || '');
      if (currentRank) {
        rankName = currentRank.rankName;
      }
    } catch (error) {
      // If rank service fails, default to Distributor
    }

    const treeNode: TreeNode = {
      id: node.id,
      userId: node.userId,
      parentId: node.parentId,
      sponsorId: node.sponsorId,
      position: node.position as TreePosition,
      level: node.level,
      path: node.path,
      leftChild: null,
      rightChild: null,
      leftVolume: 0,
      rightVolume: 0,
      totalVolume: 0,
      rank: rankName,
      isQualified: node.isQualified,
    };

    // Stop recursion at max depth
    if (currentDepth >= maxDepth) {
      return treeNode;
    }

    // Load children
    if (node.leftChildId) {
      const [leftChild] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, node.leftChildId))
        .limit(1);

      if (leftChild) {
        treeNode.leftChild = await this.buildTreeNode(leftChild, maxDepth, currentDepth + 1);
      }
    }

    if (node.rightChildId) {
      const [rightChild] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, node.rightChildId))
        .limit(1);

      if (rightChild) {
        treeNode.rightChild = await this.buildTreeNode(rightChild, maxDepth, currentDepth + 1);
      }
    }

    return treeNode;
  }

  /**
   * Get downline (all descendants in specified leg)
   */
  static async getDownline(
    userId: string,
    tenantId: string,
    leg?: TreePosition
  ): Promise<MmnTree[]> {
    const [rootNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!rootNode) {
      return [];
    }

    // If specific leg requested, start from that child
    let startNodeId = rootNode.id;
    if (leg === 'left' && rootNode.leftChildId) {
      startNodeId = rootNode.leftChildId;
    } else if (leg === 'right' && rootNode.rightChildId) {
      startNodeId = rootNode.rightChildId;
    }

    // Get all descendants
    return await this.getDescendants(startNodeId, tenantId);
  }

  /**
   * Get all descendants recursively
   */
  private static async getDescendants(
    nodeId: string,
    tenantId: string
  ): Promise<MmnTree[]> {
    const descendants: MmnTree[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const [node] = await db
        .select()
        .from(mmnTree)
        .where(
          and(
            eq(mmnTree.id, currentId),
            eq(mmnTree.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!node) continue;

      descendants.push(node);

      if (node.leftChildId) queue.push(node.leftChildId);
      if (node.rightChildId) queue.push(node.rightChildId);
    }

    return descendants;
  }

  /**
   * Get node by user ID
   */
  static async getNodeByUserId(
    userId: string,
    tenantId: string
  ): Promise<MmnTree | null> {
    const [node] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    return node || null;
  }

  /**
   * Update node status
   */
  static async updateNodeStatus(
    nodeId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<MmnTree> {
    const [updated] = await db
      .update(mmnTree)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(mmnTree.id, nodeId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Node not found');
    }

    return updated;
  }

  /**
   * Update qualification status
   */
  static async updateQualification(
    nodeId: string,
    isQualified: boolean
  ): Promise<MmnTree> {
    const [updated] = await db
      .update(mmnTree)
      .set({
        isQualified,
        ...(isQualified && { activatedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(mmnTree.id, nodeId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Node not found');
    }

    logger.info('Node qualification updated', { nodeId, isQualified });

    return updated;
  }

  /**
   * Count downline members
   */
  static async countDownline(
    userId: string,
    tenantId: string,
    leg?: TreePosition
  ): Promise<number> {
    const downline = await this.getDownline(userId, tenantId, leg);
    return downline.length;
  }

  /**
   * Get tree statistics
   */
  static async getTreeStats(
    userId: string,
    tenantId: string
  ): Promise<{
    totalMembers: number;
    leftLegCount: number;
    rightLegCount: number;
    maxDepth: number;
    activeMembers: number;
  }> {
    const [node] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!node) {
      return {
        totalMembers: 0,
        leftLegCount: 0,
        rightLegCount: 0,
        maxDepth: 0,
        activeMembers: 0,
      };
    }

    const leftLeg = await this.getDownline(userId, tenantId, 'left');
    const rightLeg = await this.getDownline(userId, tenantId, 'right');
    const allMembers = [...leftLeg, ...rightLeg];

    const maxDepth = allMembers.reduce(
      (max, member) => Math.max(max, getLevelFromPath(member.path)),
      node.level
    );

    const activeMembers = allMembers.filter(m => m.status === 'active').length;

    return {
      totalMembers: allMembers.length,
      leftLegCount: leftLeg.length,
      rightLegCount: rightLeg.length,
      maxDepth,
      activeMembers,
    };
  }
}
