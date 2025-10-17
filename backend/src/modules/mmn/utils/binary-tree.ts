/**
 * Binary Tree Utilities
 * Core algorithms for binary tree management
 */

import type { TreePosition, TreeNode, SpilloverResult } from '../types/mmn.types';

/**
 * Calculate tree path for a node
 */
export const calculatePath = (parentPath: string | null, position: TreePosition): string => {
  if (!parentPath) return '1';
  return `${parentPath}.${position === 'left' ? '1' : '2'}`;
};

/**
 * Calculate level from path
 */
export const getLevelFromPath = (path: string): number => {
  return path.split('.').length;
};

/**
 * Find next available position using breadth-first search
 */
export const findNextPosition = (
  tree: TreeNode,
  preferredLeg?: TreePosition
): SpilloverResult | null => {
  const queue: TreeNode[] = [tree];

  while (queue.length > 0) {
    const node = queue.shift()!;

    // Check preferred leg first
    if (preferredLeg === 'left' && !node.leftChild) {
      return {
        parentId: node.id,
        position: 'left',
        level: node.level + 1,
        path: calculatePath(node.path, 'left'),
      };
    }

    if (preferredLeg === 'right' && !node.rightChild) {
      return {
        parentId: node.id,
        position: 'right',
        level: node.level + 1,
        path: calculatePath(node.path, 'right'),
      };
    }

    // Otherwise, check left then right
    if (!node.leftChild) {
      return {
        parentId: node.id,
        position: 'left',
        level: node.level + 1,
        path: calculatePath(node.path, 'left'),
      };
    }

    if (!node.rightChild) {
      return {
        parentId: node.id,
        position: 'right',
        level: node.level + 1,
        path: calculatePath(node.path, 'right'),
      };
    }

    // Both positions occupied, add children to queue
    if (node.leftChild) queue.push(node.leftChild);
    if (node.rightChild) queue.push(node.rightChild);
  }

  return null;
};

/**
 * Find weaker leg for balanced spillover
 */
export const findWeakerLeg = (leftVolume: number, rightVolume: number): TreePosition => {
  return leftVolume <= rightVolume ? 'left' : 'right';
};

/**
 * Calculate binary tree depth
 */
export const calculateTreeDepth = (nodeCount: number): number => {
  if (nodeCount === 0) return 0;
  return Math.floor(Math.log2(nodeCount)) + 1;
};

/**
 * Calculate maximum nodes at level
 */
export const maxNodesAtLevel = (level: number): number => {
  return Math.pow(2, level - 1);
};

/**
 * Calculate total nodes up to level
 */
export const totalNodesUpToLevel = (level: number): number => {
  return Math.pow(2, level) - 1;
};

/**
 * Check if tree is balanced
 */
export const isTreeBalanced = (
  leftCount: number,
  rightCount: number,
  threshold: number = 0.2
): boolean => {
  const total = leftCount + rightCount;
  if (total === 0) return true;

  const leftRatio = leftCount / total;
  const rightRatio = rightCount / total;

  return Math.abs(leftRatio - rightRatio) <= threshold;
};

/**
 * Get node ancestors (upline path)
 */
export const getAncestors = (path: string): string[] => {
  const parts = path.split('.');
  const ancestors: string[] = [];

  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join('.'));
  }

  return ancestors.reverse(); // Root first
};

/**
 * Get leg position relative to ancestor
 */
export const getLegPosition = (ancestorPath: string, descendantPath: string): TreePosition | null => {
  if (!descendantPath.startsWith(ancestorPath)) return null;

  const remaining = descendantPath.substring(ancestorPath.length + 1);
  const firstPart = remaining.split('.')[0];

  return firstPart === '1' ? 'left' : 'right';
};
