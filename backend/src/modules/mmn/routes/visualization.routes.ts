/**
 * MMN Visualization Routes – require mmn:read
 */

import { Elysia, t } from 'elysia';
import { TreeService, GenealogyService, VolumeService, AnalyticsService } from '../services';
import logger from '@/utils/logger';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';

export const visualizationRoutes = new Elysia({ prefix: '/api/v1/mmn' })
  .use(sessionGuard)
  .use(requireTenant)
  .use(requirePermission('mmn', 'read'))

  .get(
    '/tree/visual',
    async ({ query, user, tenantId, set }) => {
      try {
        const tree = await TreeService.getTree(user.id, tenantId, query.depth ? Number(query.depth) : 3);
        if (!tree) {
          set.status = 404;
          return { success: false, error: 'User not found in MMN tree' };
        }

        const visualData = await convertToVisualFormat(tree, user.id, tenantId);
        return { success: true, data: visualData };
      } catch (error) {
        logger.error('Error fetching tree visualization', { error });
        set.status = 500;
        return { success: false, error: 'Failed to build visualization' };
      }
    },
    { query: t.Object({ depth: t.Optional(t.String()) }) }
  )

  .get(
    '/tree/stats',
    async ({ user, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(user.id, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'User not found in MMN tree' };
      }

      const [treeStats, genealogyStats, levelCounts] = await Promise.all([
        TreeService.getTreeStats(user.id, tenantId),
        GenealogyService.getGenealogyStats(user.id, tenantId),
        GenealogyService.countByLevel(user.id, tenantId),
      ]);

      return { success: true, data: { tree: treeStats, genealogy: genealogyStats, levelCounts } };
    }
  )

  .get(
    '/analytics',
    async ({ user, tenantId, set }) => {
      try {
        const node = await TreeService.getNodeByUserId(user.id, tenantId);
        if (!node) {
          set.status = 404;
          return { success: false, error: 'User not found in MMN tree' };
        }

        const [volumeHistory, treeGrowth, legBalance, downline] = await Promise.all([
          VolumeService.getVolumeHistory(node.id, 12),
          AnalyticsService.getGrowthMetrics(tenantId, 6),
          analyzeLegBalance(node.id, tenantId),
          GenealogyService.getDownline(user.id, tenantId),
        ]);

        const downlineSnapshot = AnalyticsService.toDownlineSnapshot(
          downline.map((member) => ({
            status: member.status,
            isQualified: member.isQualified,
            level: member.level ?? 0,
          })),
        );

        const networkHealth = AnalyticsService.computeNetworkHealthFromDownline(downlineSnapshot);
        const directMembers = downline.filter((member) => member.level === 1).length;

        return {
          success: true,
          data: {
            volumeHistory,
            treeGrowth,
            legBalance,
            networkHealth,
            team: {
              totalMembers: networkHealth.totalMembers,
              directMembers,
            },
          },
        };
      } catch (error) {
        logger.error('Error generating MMN analytics', { error, userId: user.id });
        set.status = 500;
        return { success: false, error: 'Failed to load analytics' };
      }
    }
  )

  .get(
    '/members/:userId/details',
    async ({ params, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(params.userId, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'Member not found' };
      }

      const [volumes, children, sponsored] = await Promise.all([
        VolumeService.getVolumes(node.id),
        GenealogyService.getDirectChildren(params.userId, tenantId),
        GenealogyService.countPersonallySponsored(params.userId, tenantId),
      ]);

      return { success: true, data: { node, volumes, children, personallySponsored: sponsored } };
    },
    { params: t.Object({ userId: t.String() }) }
  );

async function convertToVisualFormat(tree: any, userId: string, tenantId: string): Promise<any> {
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

async function analyzeLegBalance(nodeId: string, tenantId: string) {
  return VolumeService.calculateLegVolumes(nodeId, undefined);
}
