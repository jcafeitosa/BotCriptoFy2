/**
 * MMN Genealogy Service
 * Manages upline/downline relationships for fast queries
 */

import { db } from '@/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import {
  mmnGenealogy,
  mmnTree,
  type MmnGenealogy,
  type NewMmnGenealogy,
  type MmnTree,
} from '../schema/mmn.schema';
import { getAncestors, getLegPosition } from '../utils/binary-tree';
import type { TreePosition } from '../types/mmn.types';

export class GenealogyService {
  /**
   * Record genealogy for a new node
   * Creates relationships with all ancestors
   */
  static async recordGenealogyChain(
    memberId: string,
    parentId: string,
    tenantId: string
  ): Promise<MmnGenealogy[]> {
    logger.info('Recording genealogy chain', { memberId, parentId });

    // Get member node
    const [memberNode] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!memberNode) {
      throw new NotFoundError('Member node not found');
    }

    // Get all ancestor paths from member's path
    const ancestorPaths = getAncestors(memberNode.path);

    // Get all ancestor nodes
    const ancestors = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          inArray(mmnTree.path, ancestorPaths)
        )
      );

    // Create genealogy records
    const genealogyRecords: NewMmnGenealogy[] = [];

    for (let i = 0; i < ancestors.length; i++) {
      const ancestor = ancestors[i];
      const level = ancestors.length - i; // Distance from member
      const leg = getLegPosition(ancestor.path, memberNode.path);

      genealogyRecords.push({
        memberId,
        ancestorId: ancestor.id,
        level,
        leg: leg || undefined,
      });
    }

    if (genealogyRecords.length === 0) {
      logger.warn('No genealogy records to create', { memberId });
      return [];
    }

    const created = await db
      .insert(mmnGenealogy)
      .values(genealogyRecords)
      .returning();

    logger.info('Genealogy chain recorded', {
      memberId,
      recordsCreated: created.length,
    });

    return created;
  }

  /**
   * Get upline (ancestors) for a member
   */
  static async getUpline(
    userId: string,
    tenantId: string,
    levels?: number
  ): Promise<Array<MmnTree & { level: number; leg: string | null }>> {
    // Get member node
    const [memberNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!memberNode) {
      return [];
    }

    // Get genealogy records
    const genealogyQuery = db
      .select({
        genealogy: mmnGenealogy,
        ancestor: mmnTree,
      })
      .from(mmnGenealogy)
      .innerJoin(mmnTree, eq(mmnGenealogy.ancestorId, mmnTree.id))
      .where(eq(mmnGenealogy.memberId, memberNode.id))
      .orderBy(mmnGenealogy.level);

    const results = await genealogyQuery;

    // Filter by levels if specified
    let filtered = results;
    if (levels !== undefined) {
      filtered = results.filter(r => r.genealogy.level <= levels);
    }

    return filtered.map(r => ({
      ...r.ancestor,
      level: r.genealogy.level,
      leg: r.genealogy.leg,
    }));
  }

  /**
   * Get downline (descendants) for a member
   */
  static async getDownline(
    userId: string,
    tenantId: string,
    levels?: number,
    leg?: TreePosition
  ): Promise<Array<MmnTree & { level: number; leg: string | null }>> {
    // Get member node
    const [ancestorNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!ancestorNode) {
      return [];
    }

    // Build query conditions
    const conditions = [eq(mmnGenealogy.ancestorId, ancestorNode.id)];

    if (leg) {
      conditions.push(eq(mmnGenealogy.leg, leg));
    }

    // Get genealogy records
    const results = await db
      .select({
        genealogy: mmnGenealogy,
        member: mmnTree,
      })
      .from(mmnGenealogy)
      .innerJoin(mmnTree, eq(mmnGenealogy.memberId, mmnTree.id))
      .where(and(...conditions))
      .orderBy(mmnGenealogy.level);

    // Filter by levels if specified
    let filtered = results;
    if (levels !== undefined) {
      filtered = results.filter(r => r.genealogy.level <= levels);
    }

    return filtered.map(r => ({
      ...r.member,
      level: r.genealogy.level,
      leg: r.genealogy.leg,
    }));
  }

  /**
   * Get direct children (level 1 downline)
   */
  static async getDirectChildren(
    userId: string,
    tenantId: string
  ): Promise<{ left: MmnTree | null; right: MmnTree | null }> {
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
      return { left: null, right: null };
    }

    let left: MmnTree | null = null;
    let right: MmnTree | null = null;

    if (node.leftChildId) {
      const [leftChild] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, node.leftChildId))
        .limit(1);
      left = leftChild || null;
    }

    if (node.rightChildId) {
      const [rightChild] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, node.rightChildId))
        .limit(1);
      right = rightChild || null;
    }

    return { left, right };
  }

  /**
   * Get genealogy path (member -> root)
   */
  static async getGenealogyPath(
    userId: string,
    tenantId: string
  ): Promise<MmnTree[]> {
    const upline = await this.getUpline(userId, tenantId);

    // Sort by level (closest to root first)
    return upline.sort((a, b) => b.level - a.level);
  }

  /**
   * Check if user A is in user B's upline
   */
  static async isInUpline(
    userId: string,
    ancestorUserId: string,
    tenantId: string
  ): Promise<boolean> {
    const [memberNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    const [ancestorNode] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, ancestorUserId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!memberNode || !ancestorNode) {
      return false;
    }

    const exists = await db
      .select()
      .from(mmnGenealogy)
      .where(
        and(
          eq(mmnGenealogy.memberId, memberNode.id),
          eq(mmnGenealogy.ancestorId, ancestorNode.id)
        )
      )
      .limit(1);

    return exists.length > 0;
  }

  /**
   * Check if user A is in user B's downline
   */
  static async isInDownline(
    userId: string,
    descendantUserId: string,
    tenantId: string
  ): Promise<boolean> {
    return await this.isInUpline(descendantUserId, userId, tenantId);
  }

  /**
   * Count members at each level in downline
   */
  static async countByLevel(
    userId: string,
    tenantId: string,
    maxLevel: number = 10
  ): Promise<Record<number, number>> {
    const downline = await this.getDownline(userId, tenantId, maxLevel);

    const counts: Record<number, number> = {};
    for (let i = 1; i <= maxLevel; i++) {
      counts[i] = 0;
    }

    for (const member of downline) {
      if (member.level <= maxLevel) {
        counts[member.level] = (counts[member.level] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Get personally sponsored members (direct referrals, not necessarily direct children)
   */
  static async getPersonallySponsored(
    userId: string,
    tenantId: string
  ): Promise<MmnTree[]> {
    return await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.sponsorId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .orderBy(desc(mmnTree.createdAt));
  }

  /**
   * Count personally sponsored members
   */
  static async countPersonallySponsored(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const sponsored = await this.getPersonallySponsored(userId, tenantId);
    return sponsored.length;
  }

  /**
   * Get genealogy statistics
   */
  static async getGenealogyStats(
    userId: string,
    tenantId: string
  ): Promise<{
    uplineCount: number;
    downlineCount: number;
    personallySponsored: number;
    leftLegCount: number;
    rightLegCount: number;
    maxDepth: number;
  }> {
    const [upline, downline, sponsored, leftLeg, rightLeg] = await Promise.all([
      this.getUpline(userId, tenantId),
      this.getDownline(userId, tenantId),
      this.getPersonallySponsored(userId, tenantId),
      this.getDownline(userId, tenantId, undefined, 'left'),
      this.getDownline(userId, tenantId, undefined, 'right'),
    ]);

    const maxDepth = downline.reduce(
      (max, member) => Math.max(max, member.level),
      0
    );

    return {
      uplineCount: upline.length,
      downlineCount: downline.length,
      personallySponsored: sponsored.length,
      leftLegCount: leftLeg.length,
      rightLegCount: rightLeg.length,
      maxDepth,
    };
  }

  /**
   * Rebuild genealogy for a node (repair function)
   */
  static async rebuildGenealogy(
    memberId: string,
    tenantId: string
  ): Promise<void> {
    logger.info('Rebuilding genealogy', { memberId });

    // Delete existing genealogy
    await db
      .delete(mmnGenealogy)
      .where(eq(mmnGenealogy.memberId, memberId));

    // Get member node
    const [memberNode] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!memberNode || !memberNode.parentId) {
      logger.warn('Cannot rebuild genealogy - no parent', { memberId });
      return;
    }

    // Recreate genealogy
    await this.recordGenealogyChain(memberId, memberNode.parentId, tenantId);

    logger.info('Genealogy rebuilt', { memberId });
  }
}
