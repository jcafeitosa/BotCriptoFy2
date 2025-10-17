/**
 * MMN Rank Service
 * Manages rank qualification and advancement
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import {
  mmnRanks,
  mmnTree,
  type MmnRank,
  type NewMmnRank,
} from '../schema/mmn.schema';
import { VolumeService } from './volume.service';
import { GenealogyService } from './genealogy.service';
import { TreeService } from './tree.service';
import type { RankRequirements } from '../types/mmn.types';

/**
 * Rank definitions with requirements
 */
const RANK_DEFINITIONS: Record<string, {
  level: number;
  requirements: RankRequirements;
  achievementBonus: number;
  monthlyBonus: number;
}> = {
  Distributor: {
    level: 1,
    requirements: {
      personalSales: 0,
      teamSales: 0,
      activeDownline: 0,
      leftLegVolume: 0,
      rightLegVolume: 0,
      qualifiedLegs: 0,
    },
    achievementBonus: 0,
    monthlyBonus: 0,
  },
  Bronze: {
    level: 2,
    requirements: {
      personalSales: 500,
      teamSales: 2000,
      activeDownline: 2,
      leftLegVolume: 1000,
      rightLegVolume: 1000,
      qualifiedLegs: 2,
    },
    achievementBonus: 100,
    monthlyBonus: 50,
  },
  Silver: {
    level: 3,
    requirements: {
      personalSales: 1000,
      teamSales: 5000,
      activeDownline: 5,
      leftLegVolume: 2500,
      rightLegVolume: 2500,
      qualifiedLegs: 2,
    },
    achievementBonus: 250,
    monthlyBonus: 150,
  },
  Gold: {
    level: 4,
    requirements: {
      personalSales: 2000,
      teamSales: 15000,
      activeDownline: 10,
      leftLegVolume: 7500,
      rightLegVolume: 7500,
      qualifiedLegs: 2,
    },
    achievementBonus: 500,
    monthlyBonus: 300,
  },
  Platinum: {
    level: 5,
    requirements: {
      personalSales: 3000,
      teamSales: 50000,
      activeDownline: 20,
      leftLegVolume: 25000,
      rightLegVolume: 25000,
      qualifiedLegs: 2,
    },
    achievementBonus: 1000,
    monthlyBonus: 750,
  },
  Diamond: {
    level: 6,
    requirements: {
      personalSales: 5000,
      teamSales: 100000,
      activeDownline: 50,
      leftLegVolume: 50000,
      rightLegVolume: 50000,
      qualifiedLegs: 2,
    },
    achievementBonus: 2500,
    monthlyBonus: 2000,
  },
  'Double Diamond': {
    level: 7,
    requirements: {
      personalSales: 10000,
      teamSales: 250000,
      activeDownline: 100,
      leftLegVolume: 125000,
      rightLegVolume: 125000,
      qualifiedLegs: 2,
    },
    achievementBonus: 5000,
    monthlyBonus: 5000,
  },
  'Triple Diamond': {
    level: 8,
    requirements: {
      personalSales: 20000,
      teamSales: 500000,
      activeDownline: 200,
      leftLegVolume: 250000,
      rightLegVolume: 250000,
      qualifiedLegs: 2,
    },
    achievementBonus: 10000,
    monthlyBonus: 10000,
  },
  Crown: {
    level: 9,
    requirements: {
      personalSales: 50000,
      teamSales: 1000000,
      activeDownline: 500,
      leftLegVolume: 500000,
      rightLegVolume: 500000,
      qualifiedLegs: 2,
    },
    achievementBonus: 25000,
    monthlyBonus: 25000,
  },
  'Royal Crown': {
    level: 10,
    requirements: {
      personalSales: 100000,
      teamSales: 2500000,
      activeDownline: 1000,
      leftLegVolume: 1250000,
      rightLegVolume: 1250000,
      qualifiedLegs: 2,
    },
    achievementBonus: 50000,
    monthlyBonus: 50000,
  },
};

export class RankService {
  /**
   * Calculate and update rank for a member
   */
  static async calculateRank(
    userId: string,
    tenantId: string
  ): Promise<MmnRank | null> {
    logger.info('Calculating rank', { userId, tenantId });

    // Get member node
    const member = await TreeService.getNodeByUserId(userId, tenantId);

    if (!member) {
      throw new NotFoundError('Member not found in MMN tree');
    }

    // Get current stats
    const stats = await this.getMemberStats(member.id, tenantId);

    // Determine highest rank qualified for
    let qualifiedRank: string | null = null;
    let qualifiedLevel = 0;

    for (const [rankName, definition] of Object.entries(RANK_DEFINITIONS)) {
      const meetsRequirements = this.meetsRequirements(stats, definition.requirements);

      if (meetsRequirements && definition.level > qualifiedLevel) {
        qualifiedRank = rankName;
        qualifiedLevel = definition.level;
      }
    }

    if (!qualifiedRank) {
      qualifiedRank = 'Distributor';
      qualifiedLevel = 1;
    }

    // Get current rank
    const [currentRank] = await db
      .select()
      .from(mmnRanks)
      .where(
        and(
          eq(mmnRanks.memberId, member.id),
          eq(mmnRanks.isActive, true)
        )
      )
      .orderBy(desc(mmnRanks.achievedAt))
      .limit(1);

    // Check if rank changed
    if (currentRank && currentRank.rankName === qualifiedRank) {
      logger.debug('Rank unchanged', { userId, rank: qualifiedRank });
      return currentRank;
    }

    // Rank advancement detected
    if (currentRank) {
      // Deactivate old rank
      await db
        .update(mmnRanks)
        .set({
          isActive: false,
          lostAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(mmnRanks.id, currentRank.id));
    }

    // Create new rank record
    const definition = RANK_DEFINITIONS[qualifiedRank];

    const newRank: NewMmnRank = {
      memberId: member.id,
      rankName: qualifiedRank,
      rankLevel: qualifiedLevel,
      previousRank: currentRank?.rankName,
      requirements: stats,
      achievementBonus: definition.achievementBonus.toString(),
      monthlyBonus: definition.monthlyBonus.toString(),
      isActive: true,
    };

    const [rank] = await db.insert(mmnRanks).values(newRank).returning();

    logger.info('Rank updated', {
      userId,
      previousRank: currentRank?.rankName || 'None',
      newRank: qualifiedRank,
      level: qualifiedLevel,
    });

    return rank;
  }

  /**
   * Get member statistics for rank calculation
   */
  private static async getMemberStats(
    memberId: string,
    tenantId: string
  ): Promise<RankRequirements> {
    // Get volumes (current period)
    const volumes = await VolumeService.getVolumes(memberId);

    const personalSales = volumes ? parseFloat(volumes.personalVolume) : 0;
    const leftLegVolume = volumes ? parseFloat(volumes.leftVolume) : 0;
    const rightLegVolume = volumes ? parseFloat(volumes.rightVolume) : 0;
    const teamSales = leftLegVolume + rightLegVolume;

    // Get downline stats
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const downline = await GenealogyService.getDownline(
      member.userId,
      tenantId
    );

    const activeDownline = downline.filter(d => d.status === 'active').length;

    // Count qualified legs (active members with minimum volume)
    const leftLeg = await GenealogyService.getDownline(
      member.userId,
      tenantId,
      undefined,
      'left'
    );

    const rightLeg = await GenealogyService.getDownline(
      member.userId,
      tenantId,
      undefined,
      'right'
    );

    let qualifiedLegs = 0;
    if (leftLeg.some(m => m.isQualified)) qualifiedLegs++;
    if (rightLeg.some(m => m.isQualified)) qualifiedLegs++;

    return {
      personalSales,
      teamSales,
      activeDownline,
      leftLegVolume,
      rightLegVolume,
      qualifiedLegs,
    };
  }

  /**
   * Check if member meets rank requirements
   */
  private static meetsRequirements(
    stats: RankRequirements,
    requirements: RankRequirements
  ): boolean {
    return (
      stats.personalSales >= requirements.personalSales &&
      stats.teamSales >= requirements.teamSales &&
      stats.activeDownline >= requirements.activeDownline &&
      stats.leftLegVolume >= requirements.leftLegVolume &&
      stats.rightLegVolume >= requirements.rightLegVolume &&
      stats.qualifiedLegs >= requirements.qualifiedLegs
    );
  }

  /**
   * Get rank requirements
   */
  static getRankRequirements(rankName: string): RankRequirements {
    const definition = RANK_DEFINITIONS[rankName];

    if (!definition) {
      throw new BadRequestError(`Unknown rank: ${rankName}`);
    }

    return definition.requirements;
  }

  /**
   * Get all rank definitions
   */
  static getAllRankDefinitions(): typeof RANK_DEFINITIONS {
    return RANK_DEFINITIONS;
  }

  /**
   * Get current rank for member
   */
  static async getCurrentRank(
    userId: string,
    tenantId: string
  ): Promise<MmnRank | null> {
    const member = await TreeService.getNodeByUserId(userId, tenantId);

    if (!member) {
      return null;
    }

    const [rank] = await db
      .select()
      .from(mmnRanks)
      .where(
        and(
          eq(mmnRanks.memberId, member.id),
          eq(mmnRanks.isActive, true)
        )
      )
      .orderBy(desc(mmnRanks.achievedAt))
      .limit(1);

    return rank || null;
  }

  /**
   * Get rank history for member
   */
  static async getRankHistory(
    userId: string,
    tenantId: string
  ): Promise<MmnRank[]> {
    const member = await TreeService.getNodeByUserId(userId, tenantId);

    if (!member) {
      return [];
    }

    return await db
      .select()
      .from(mmnRanks)
      .where(eq(mmnRanks.memberId, member.id))
      .orderBy(desc(mmnRanks.achievedAt));
  }

  /**
   * Get progress to next rank
   */
  static async getRankProgress(
    userId: string,
    tenantId: string
  ): Promise<{
    currentRank: string;
    currentLevel: number;
    nextRank: string | null;
    nextLevel: number | null;
    progress: Partial<Record<keyof RankRequirements, {
      current: number;
      required: number;
      percentage: number;
    }>>;
  }> {
    const member = await TreeService.getNodeByUserId(userId, tenantId);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const currentRank = await this.getCurrentRank(userId, tenantId);
    const currentRankName = currentRank?.rankName || 'Distributor';
    const currentLevel = currentRank?.rankLevel || 1;

    // Find next rank
    const nextLevel = currentLevel + 1;
    const nextRankEntry = Object.entries(RANK_DEFINITIONS).find(
      ([_, def]) => def.level === nextLevel
    );

    const nextRank = nextRankEntry ? nextRankEntry[0] : null;
    const nextRequirements = nextRankEntry ? nextRankEntry[1].requirements : null;

    // Get current stats
    const currentStats = await this.getMemberStats(member.id, tenantId);

    // Calculate progress
    const progress: any = {};

    if (nextRequirements) {
      for (const [key, required] of Object.entries(nextRequirements)) {
        const current = currentStats[key as keyof RankRequirements];
        const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 100;

        progress[key] = {
          current,
          required,
          percentage: Math.round(percentage),
        };
      }
    }

    return {
      currentRank: currentRankName,
      currentLevel,
      nextRank,
      nextLevel: nextRank ? nextLevel : null,
      progress,
    };
  }

  /**
   * Get rank leaderboard for tenant
   */
  static async getRankLeaderboard(
    tenantId: string,
    limit: number = 50
  ): Promise<Array<{
    userId: string;
    rankName: string;
    rankLevel: number;
    achievedAt: Date;
  }>> {
    const results = await db
      .select({
        memberId: mmnRanks.memberId,
        rankName: mmnRanks.rankName,
        rankLevel: mmnRanks.rankLevel,
        achievedAt: mmnRanks.achievedAt,
        userId: mmnTree.userId,
      })
      .from(mmnRanks)
      .innerJoin(mmnTree, eq(mmnRanks.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          eq(mmnRanks.isActive, true)
        )
      )
      .orderBy(desc(mmnRanks.rankLevel), desc(mmnRanks.achievedAt))
      .limit(limit);

    return results.map(r => ({
      userId: r.userId,
      rankName: r.rankName,
      rankLevel: r.rankLevel,
      achievedAt: r.achievedAt,
    }));
  }
}
