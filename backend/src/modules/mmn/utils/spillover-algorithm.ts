/**
 * Spillover Algorithm
 * Implements automatic placement in binary tree
 */

import type { TreePosition, SpilloverResult, SpilloverStrategy } from '../types/mmn.types';
import { findWeakerLeg, calculatePath } from './binary-tree';

/**
 * Spillover placement strategies
 */
export class SpilloverAlgorithm {
  /**
   * Find placement using weaker leg strategy
   * Places new member under sponsor's weaker leg
   */
  static weakerLegPlacement(
    sponsorLeftVolume: number,
    sponsorRightVolume: number,
    sponsorLeftChild: string | null,
    sponsorRightChild: string | null,
    sponsorId: string,
    sponsorPath: string,
    sponsorLevel: number
  ): SpilloverResult {
    const weakerLeg = findWeakerLeg(sponsorLeftVolume, sponsorRightVolume);

    // If position is available, place there
    if (weakerLeg === 'left' && !sponsorLeftChild) {
      return {
        parentId: sponsorId,
        position: 'left',
        level: sponsorLevel + 1,
        path: calculatePath(sponsorPath, 'left'),
      };
    }

    if (weakerLeg === 'right' && !sponsorRightChild) {
      return {
        parentId: sponsorId,
        position: 'right',
        level: sponsorLevel + 1,
        path: calculatePath(sponsorPath, 'right'),
      };
    }

    // Position occupied, need to drill down
    throw new Error('Spillover requires tree traversal - implement in service');
  }

  /**
   * Find placement using balanced strategy
   * Maintains tree balance
   */
  static balancedPlacement(
    leftCount: number,
    rightCount: number,
    sponsorLeftChild: string | null,
    sponsorRightChild: string | null,
    sponsorId: string,
    sponsorPath: string,
    sponsorLevel: number
  ): SpilloverResult {
    // Place in leg with fewer members
    const targetLeg: TreePosition = leftCount <= rightCount ? 'left' : 'right';

    if (targetLeg === 'left' && !sponsorLeftChild) {
      return {
        parentId: sponsorId,
        position: 'left',
        level: sponsorLevel + 1,
        path: calculatePath(sponsorPath, 'left'),
      };
    }

    if (targetLeg === 'right' && !sponsorRightChild) {
      return {
        parentId: sponsorId,
        position: 'right',
        level: sponsorLevel + 1,
        path: calculatePath(sponsorPath, 'right'),
      };
    }

    throw new Error('Spillover requires tree traversal - implement in service');
  }

  /**
   * Calculate optimal placement level
   * Returns the level where placement should occur based on tree fill rate
   */
  static calculateOptimalLevel(totalMembers: number): number {
    if (totalMembers === 0) return 1;
    return Math.floor(Math.log2(totalMembers + 1)) + 1;
  }

  /**
   * Validate placement
   */
  static validatePlacement(
    parentId: string,
    position: TreePosition,
    existingLeft: string | null,
    existingRight: string | null
  ): boolean {
    if (position === 'left' && existingLeft) return false;
    if (position === 'right' && existingRight) return false;
    return true;
  }
}

/**
 * Binary tree fill calculator
 */
export const calculateFillRate = (actualNodes: number, maxNodes: number): number => {
  if (maxNodes === 0) return 0;
  return (actualNodes / maxNodes) * 100;
};

/**
 * Predict next n placements
 */
export const predictPlacements = (
  currentTreeSize: number,
  newMembers: number,
  _strategy: SpilloverStrategy
): Array<{ level: number; position: TreePosition }> => {
  const placements: Array<{ level: number; position: TreePosition }> = [];
  let size = currentTreeSize;

  for (let i = 0; i < newMembers; i++) {
    size++;
    const level = Math.floor(Math.log2(size)) + 1;
    const positionInLevel = size - Math.pow(2, level - 1);
    const position: TreePosition = positionInLevel % 2 === 0 ? 'left' : 'right';

    placements.push({ level, position });
  }

  return placements;
};
