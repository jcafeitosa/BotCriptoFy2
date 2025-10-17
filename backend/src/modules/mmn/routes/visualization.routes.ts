/**
 * MMN Visualization Routes
 * Endpoints for tree visualization and analytics
 */

import { Elysia, t } from 'elysia';
import {
  TreeService,
  GenealogyService,
  VolumeService,
} from '../services';
import logger from '@/utils/logger';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';

export const visualizationRoutes = new Elysia({ prefix: '/api/v1/mmn' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Get tree visualization data
   * GET /api/v1/mmn/tree/visual
   */
  .get(
    '/tree/visual',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting tree visualization', { userId: user.id });

      const depth = query.depth ? parseInt(query.depth) : 3;
      const tree = await TreeService.getTree(user.id, tenantId, depth);

      if (!tree) {
        return { error: 'Not in MMN tree' };
      }

      // Convert tree to visualization format
      const visualData = await convertToVisualFormat(tree, user.id, tenantId);

      return visualData;
    },
    {
      query: t.Object({
        depth: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN - Visualization'],
        summary: 'Get tree visualization',
        description: 'Get tree data formatted for visualization libraries (D3, ECharts, etc.)',
      },
    }
  )

  /**
   * Get tree statistics
   * GET /api/v1/mmn/tree/stats
   */
  .get(
    '/tree/stats',
    async ({ user, tenantId }: any) => {
      logger.info('Getting tree statistics', { userId: user.id });

      const node = await TreeService.getNodeByUserId(user.id, tenantId);

      if (!node) {
        return { error: 'Not in MMN tree' };
      }

      const [treeStats, genealogyStats] = await Promise.all([
        TreeService.getTreeStats(user.id, tenantId),
        GenealogyService.getGenealogyStats(user.id, tenantId),
      ]);

      const levelCounts = await GenealogyService.countByLevel(user.id, tenantId);

      return {
        tree: treeStats,
        genealogy: genealogyStats,
        levelCounts,
      };
    },
    {
      detail: {
        tags: ['MMN - Visualization'],
        summary: 'Get tree statistics',
        description: 'Get comprehensive tree statistics for charts and analytics',
      },
    }
  )

  /**
   * Get analytics data
   * GET /api/v1/mmn/analytics
   */
  .get(
    '/analytics',
    async ({ query: _query, user, tenantId }: any) => {
      logger.info('Getting MMN analytics', { userId: user.id });

      const node = await TreeService.getNodeByUserId(user.id, tenantId);

      if (!node) {
        return { error: 'Not in MMN tree' };
      }

      // Get volume history
      const volumeHistory = await VolumeService.getVolumeHistory(node.id, 12);

      // Get tree growth over time (simplified)
      const treeGrowth = await getTreeGrowth(user.id, tenantId);

      // Get leg balance analysis
      const legBalance = await analyzeLegBalance(node.id, tenantId);

      return {
        volumeHistory,
        treeGrowth,
        legBalance,
      };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN - Visualization'],
        summary: 'Get analytics',
        description: 'Get comprehensive analytics data for dashboards',
      },
    }
  )

  /**
   * Get member details for tooltip
   * GET /api/v1/mmn/members/:userId/details
   */
  .get(
    '/members/:userId/details',
    async ({ params, tenantId }: any) => {
      logger.info('Getting member details', { userId: params.userId });

      const node = await TreeService.getNodeByUserId(params.userId, tenantId);

      if (!node) {
        return { error: 'Member not found' };
      }

      const volumes = await VolumeService.getVolumes(node.id);
      const children = await GenealogyService.getDirectChildren(params.userId, tenantId);
      const sponsored = await GenealogyService.countPersonallySponsored(params.userId, tenantId);

      return {
        node,
        volumes,
        children,
        personallySponsored: sponsored,
      };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      detail: {
        tags: ['MMN - Visualization'],
        summary: 'Get member details',
        description: 'Get member details for tooltips and info cards',
      },
    }
  );

/**
 * Helper: Convert tree to visualization format
 */
async function convertToVisualFormat(
  tree: any,
  userId: string,
  tenantId: string
): Promise<any> {
  if (!tree) return null;

  const node: any = {
    id: tree.id,
    userId: tree.userId,
    name: `User ${tree.userId.substring(0, 8)}`,
    position: tree.position,
    level: tree.level,
    isQualified: tree.isQualified,
    rank: tree.rank,
    leftVolume: tree.leftVolume,
    rightVolume: tree.rightVolume,
    totalVolume: tree.totalVolume,
    children: [],
  };

  if (tree.leftChild) {
    node.children.push(await convertToVisualFormat(tree.leftChild, userId, tenantId));
  }

  if (tree.rightChild) {
    node.children.push(await convertToVisualFormat(tree.rightChild, userId, tenantId));
  }

  return node;
}

/**
 * Helper: Get tree growth over time
 */
async function getTreeGrowth(userId: string, _tenantId: string): Promise<any[]> {
  // Simplified implementation
  // In production, would track historical data
  const downline = await GenealogyService.getDownline(userId, _tenantId);

  // Group by month (simplified)
  const growth: Record<string, number> = {};

  for (const member of downline) {
    const month = new Date(member.createdAt).toISOString().substring(0, 7);
    growth[month] = (growth[month] || 0) + 1;
  }

  return Object.entries(growth).map(([month, count]) => ({
    month,
    count,
  }));
}

/**
 * Helper: Analyze leg balance
 */
async function analyzeLegBalance(memberId: string, _tenantId: string): Promise<any> {
  const volumes = await VolumeService.getVolumes(memberId);

  if (!volumes) {
    return {
      isBalanced: true,
      leftPercentage: 50,
      rightPercentage: 50,
      imbalance: 0,
    };
  }

  const leftVol = parseFloat(volumes.leftVolume);
  const rightVol = parseFloat(volumes.rightVolume);
  const total = leftVol + rightVol;

  if (total === 0) {
    return {
      isBalanced: true,
      leftPercentage: 50,
      rightPercentage: 50,
      imbalance: 0,
    };
  }

  const leftPct = (leftVol / total) * 100;
  const rightPct = (rightVol / total) * 100;
  const imbalance = Math.abs(leftPct - rightPct);

  return {
    isBalanced: imbalance <= 20, // Within 20% is considered balanced
    leftPercentage: Math.round(leftPct),
    rightPercentage: Math.round(rightPct),
    imbalance: Math.round(imbalance),
    leftVolume: leftVol,
    rightVolume: rightVol,
  };
}
