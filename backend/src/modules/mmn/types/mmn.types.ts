/**
 * MMN Types
 */

import type {
  MmnTree,
  MmnGenealogy,
  MmnPosition,
  MmnVolume,
  MmnCommission,
  MmnRank,
  MmnPayout,
  MmnConfig,
} from '../schema/mmn.schema';

export type TreePosition = 'left' | 'right';
export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type CommissionType = 'binary' | 'unilevel' | 'matching' | 'leadership';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SpilloverStrategy = 'weaker_leg' | 'balanced' | 'manual';

export interface JoinMmnData {
  userId: string;
  tenantId: string;
  sponsorId: string;
  preferredPosition?: TreePosition;
  subscriptionPlanId?: string;
}

export interface TreeNode {
  id: string;
  userId: string;
  parentId: string | null;
  sponsorId: string;
  position: TreePosition;
  level: number;
  path: string;
  leftChild: TreeNode | null;
  rightChild: TreeNode | null;
  leftVolume: number;
  rightVolume: number;
  totalVolume: number;
  rank: string;
  isQualified: boolean;
}

export interface SpilloverResult {
  parentId: string;
  position: TreePosition;
  level: number;
  path: string;
}

export interface VolumeUpdate {
  memberId: string;
  personalVolume: number;
  propagateToUpline: boolean;
}

export interface CommissionCalculation {
  memberId: string;
  type: CommissionType;
  level: number;
  volume: number;
  rate: number;
  amount: number;
}

export interface BinaryCalculation {
  leftVolume: number;
  rightVolume: number;
  weakerLeg: number;
  strongerLeg: number;
  commissionableVolume: number;
  commission: number;
  leftCarryForward: number;
  rightCarryForward: number;
}

export interface RankRequirements {
  personalSales: number;
  teamSales: number;
  activeDownline: number;
  leftLegVolume: number;
  rightLegVolume: number;
  qualifiedLegs: number;
}

export interface MmnStats {
  totalMembers: number;
  activeMembers: number;
  totalVolume: number;
  totalCommissions: number;
  averageDepth: number;
  fillRate: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type {
  MmnTree,
  MmnGenealogy,
  MmnPosition,
  MmnVolume,
  MmnCommission,
  MmnRank,
  MmnPayout,
  MmnConfig,
};
